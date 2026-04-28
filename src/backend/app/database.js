import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = mysql.createConnection({
    host:process.env.HOST,
    database:process.env.DATABASE,
    user:process.env.USER,
    password:process.env.PASSWORD 
});

const getConnection = async () =>  await connection;

export default {
    getConnection
}