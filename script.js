const express = require("express")
const router = express.Router();


const pool = require("./db")
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

router.get("/", (req,res) =>{


})
