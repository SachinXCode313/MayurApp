import express, { json } from "express";
import mysql from "mysql2";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());



// Initialize the database connection
const db = mysql.createConnection({
    host: "localhost",  
    user: "root",        
    password: "sachin@313",        
    database: "mayoor" 
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }
    console.log("Connected to the database");
});





// GET API to fetch all data





// Start the server
app.listen(PORT, (err) => {
    if (err) {
        console.error("Error starting server:", err);
    } else {
        console.log(`Server running on port ${PORT}`);
    }
});
