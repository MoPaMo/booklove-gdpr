const express = require("express");
const router = express.Router();
const fs = require('fs').promises;
const Mustache = require('mustache');
const pool = require("./db");
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/authenticateToken');

let template;
(async () => {
  try {
    template = await fs.readFile('index.html', 'utf-8');
  } catch (err) {
    console.error('Failed to load template', err);
  }
})();

async function getId(download_key) {
    const result = await pool.query(
        'SELECT id FROM user_data_download_links WHERE download_key = $1',
        [download_key]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}

async function getUserData(userId) {
  const client = await pool.connect();
  try {
    const userData = await client.query(`
      SELECT apple_id, name, profile_image_url, favorite_book, created_at, updated_at
      FROM users
      WHERE id = $1;
    `, [userId]);

    const userBooks = await client.query(`
      SELECT books.title AS book_title, genres.name AS genre_name, userbooks.status, userbooks.comment, userbooks.created_at, userbooks.updated_at
      FROM userbooks
      JOIN books ON userbooks.book_id = books.id
      JOIN bookgenres ON books.id = bookgenres.book_id
      JOIN genres ON bookgenres.genre_id = genres.id
      WHERE userbooks.user_id = $1;
    `, [userId]);

    const userGenres = await client.query(`
      SELECT genres.name AS genre_name
      FROM usergenres
      JOIN genres ON usergenres.genre_id = genres.id
      WHERE usergenres.user_id = $1;
    `, [userId]);

    const userQuotes = await client.query(`
      SELECT books.title AS book_title, quotes.content, quotes.page_number, quotes.created_at, quotes.said_by
      FROM quotes
      JOIN books ON quotes.book_id = books.id
      WHERE quotes.user_id = $1;
    `, [userId]);

    const userFollows = await client.query(`
      SELECT f1.name AS follower_name, f2.name AS followed_name, follows.created_at
      FROM follows
      LEFT JOIN users f1 ON follows.follower_id = f1.id
      LEFT JOIN users f2 ON follows.followed_id = f2.id
      WHERE follows.follower_id = $1 OR follows.followed_id = $1;
    `, [userId]);

    const userQuoteLikes = await client.query(`
      SELECT quotes.content AS quote_content, books.title AS book_title
      FROM quotelikes
      JOIN quotes ON quotelikes.quote_id = quotes.id
      JOIN books ON quotes.book_id = books.id
      WHERE quotelikes.user_id = $1;
    `, [userId]);

    const userReports = await client.query(`
      SELECT reports.content_type, reports.content_id, reports.reason, reports.created_at
      FROM reports
      WHERE reports.reporter_id = $1;
    `, [userId]);

    return {
      user: userData.rows[0],
      books: userBooks.rows,
      genres: userGenres.rows,
      quotes: userQuotes.rows,
      follows: userFollows.rows,
      quoteLikes: userQuoteLikes.rows,
      reports: userReports.rows
    };
  } finally {
    client.release();
  }
}

function checkKey(req, res, next) {
  if (!req.query.key) {
    res.status(401).send("Unauthorized");
  } else {
    next();
  }
}

router.get("/view/", checkKey, async (req, res) => {
if(!req.query.key){
    return res.status(401).json({ message: 'Unauthorized' });
}
else{
const id = await getId(req.query.key)
}
if(!id){
res.status(401).json({ message: 'Unauthorized' });}
  try {
    const data = await getUserData(id);
    const text = Mustache.render(template, data);
    res.send(text);
  } catch (err) {
    console.error('Error rendering view:', err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/data.json", checkKey, async (req, res) => {
if(!req.query.key){
    return res.status(401).json({ message: 'Unauthorized' });
}
else{
const id = await getId(req.query.key)
}
if(!id){
res.status(401).json({ message: 'Unauthorized' });}
  try {
    const data = await getUserData(req.query.key);
    res.json(data);
  } catch (err) {
    console.error('Error returning JSON data:', err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get-code', authenticateToken, async (req, res) => {
    const user_id = req.user.userId;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const download_key = uuidv4(); 
    try {
        const result = await pool.query(
            `INSERT INTO user_data_download_links (user_id, download_key, expires_at)
             VALUES ($1, $2, $3)`,
            [user_id, download_key, expiresAt]
        );
        res.send(download_key)
    } catch (error) {
        console.error('Error creating download link:', error);
        res.status(500).send('Internal Server Error' );
    }
});


module.exports = router;