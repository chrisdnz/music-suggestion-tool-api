import { config } from 'dotenv';
import express from 'express';
import request from 'request';
import cors from 'cors';
import querystring from 'querystring';
import cookieParser from 'cookie-parser';

config({ path: "./.env" });

// Node environment variables

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PORT = process.env.PORT;
const environment = process.env.NODE_ENV

// END 

// Middleware for express server

var app = express();
app.use(cors())
  .use(cookieParser());

// END


app.listen(PORT || 8080, () => {
  console.log(`Listening on port ${PORT || 8080}`)
})