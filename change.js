import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8000;
app.use(express.json());
app.use(cors());

(async () => {
    try {
        const db = await mysql.createPool({
            host: "localhost",
            user: "root",
            password: "sachin@313",
            database: "mayoor",
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
        console.log("Connected to the database");

        //--------------------------------------------------------------------------------------------------------------------------------------------------
        app.get('/api/students', async (req, res) => {
            const year = req.headers['year'];
            const className = req.headers['class'];
            const section = req.headers['section'];
            
            if (!year || !className || !section) {
                return res.status(400).json({
                    message: "Missing required headers. Please provide 'year', 'class', and 'section'."
                });
            }

            if (isNaN(year) || isNaN(className) || !section.trim()) {
                return res.status(400).json({
                    message: "Invalid header values. 'year' and 'class' should be numbers, and 'section' cannot be empty."
                });
            }

            try {
                const query = `
                    SELECT s.name 
                    FROM students s 
                    JOIN students_records sc ON s.id = sc.student_id 
                    WHERE sc.year = ? AND sc.class = ? AND sc.section = ?
                `;

                const [results] = await db.execute(query, [year, className, section]);

                if (results.length === 0) {
                    return res.status(404).json({ message: 'No students found for the given year, class, and section.' });
                }

                return res.status(200).json({ Students: results });
            } catch (err) {
                console.error(err);
                return res.status(500).json({ message: 'Server error' });
            }
        });

//--------------------------------------------------------------------------------------------------------------------------------------------------
        app.post('/api/students', async (req, res) => {
            const year = req.headers['year'];
            const className = req.headers['class'];
            const section = req.headers['section'];
            const studentName = req.body.studentName;
            if (!year || !className || !section || !studentName) {
                return res.status(400).json({
                    message: "Missing required headers. Please provide 'year', 'class', 'section' and 'studentName'."
                });
            }
            if (isNaN(year) || isNaN(className) || !section.trim() || !studentName.trim()) {
                return res.status(400).json({
                    message: "Invalid header values. 'year' and 'class' should be numbers, and 'section' cannot be empty."
                });
            }
            try {
                const insertStudentQuery = `
                    INSERT INTO students (id, name)
                    SELECT COALESCE(MAX(id), 0) + 1, ? FROM students`;
                await db.execute(insertStudentQuery, [studentName]);
                const [newStudentIdRow] = await db.execute('SELECT MAX(id) AS newId FROM students');
                const newStudentId = newStudentIdRow[0].newId;
                const insertRecordQuery = `
                    INSERT INTO students_records (id, student_id, class, section, year)
                    SELECT COALESCE(MAX(id), 0) + 1, ?, ?, ?, ? FROM students_records`;
                await db.execute(insertRecordQuery, [newStudentId, className, section, year]);
                return res.status(201).json({
                    message: "Student and record inserted successfully"
                });
            } catch (error) {
                console.error('Error during student insertion:', error);
                return res.status(500).json({
                    message: "An error occurred while inserting student and record.",
                    error: error.message
                });
            }
        });

//--------------------------------------------------------------------------------------------------------------------------------------------------
        app.get("/api/report_outcomes", async (req, res) => {
            const year = req.headers["year"];
            const subject = req.headers["subject"];

            if (!year || !subject) {
                return res.status(400).json({
                    message: "Missing required headers. Please provide 'year' and 'subject'.",
                });
            }

            if (isNaN(year) || !subject.trim()) {
                return res.status(400).json({
                    message: "Invalid header values. 'year' should be a number, and 'subject' cannot be empty.",
                });
            }

            try {
                const query = `
            SELECT id, name 
            FROM report_outcomes 
            WHERE year = ? AND subject = ?
            `;
                const [results] = await db.execute(query, [year, subject]);

                if (results.length === 0) {
                    return res.status(404).json({ message: "No report outcomes found for the given year and subject." });
                }

                res.status(200).json({ ro: results });
            } catch (err) {
                console.error("Error fetching report outcomes:", err);
                res.status(500).json({ message: "Server error" });
            }
        });

//--------------------------------------------------------------------------------------------------------------------------------------------------
        app.post("/api/learning_outcomes", async (req, res) => {
            const { year, quarter,className, subject } = req.headers;
            const { name } = req.body;
        
            if (!year || !quarter || !className || !subject || !name) {
                return res.status(400).json({
                    message: "Missing required fields: year, quarter,class, subject (headers) or name (body).",
                });
            }
            try {
                const [maxIdRow] = await db.execute('SELECT MAX(id) AS maxId FROM learning_outcomes');
                const newId = (maxIdRow[0].maxId || 0) + 1; 
        
                const query = `
                INSERT INTO learning_outcomes (id, name, year, quarter,class, subject) 
                VALUES (?, ?, ?, ?, ?, ?)
                `;
                const [result] = await db.execute(query, [newId, name, year, quarter,className, subject]);
        
                res.status(201).json({
                    message: "Learning outcome added successfully",
                    insertedId: newId, // Respond with the manually generated ID
                });
            } catch (err) {
                console.error("Error inserting learning outcome:", err);
                res.status(500).json({ message: "Server error", error: err.message });
            }
        });

//--------------------------------------------------------------------------------------------------------------------------------------------------
        app.get("/api/learning_outcomes", async (req, res) => {
            const { year, subject,className, quarter } = req.headers;

            if (!year || !subject || !quarter ||!className) {
                return res.status(400).json({ message: "Missing required headers: year, subject,class or quarter" });
            }

            try {
                const query = `
            SELECT id, name 
            FROM learning_outcomes 
            WHERE year = ? AND subject = ? AND quarter = ? AND class = ?
            `;
                const [results] = await db.execute(query, [year, subject, quarter,className]);

                if (results.length === 0) {
                    return res.status(404).json({ message: "No learning outcomes found for the provided filters" });
                }

                res.status(200).json(results);
            } catch (err) {
                console.error("Error fetching learning outcomes:", err);
                res.status(500).json({ message: "Internal server error" });
            }
        });

//--------------------------------------------------------------------------------------------------------------------------------------------------
        app.get('/api/assessment_criterias', async (req, res) => {
            const { subject, year, quarter,className } = req.headers; // Extract headers

            console.log(`Subject: ${subject}, Year: ${year}, Quarter: ${quarter} , class: ${className}`);

            // Validate input
            if (!subject || !year || !quarter || !className) {
                return res.status(400).json({
                    message: 'Invalid input. Subject,Class, Year, and Quarter are required in the headers.',
                });
            }

            try {
                // SQL query to fetch assessment_criterias based on filters
                const query = `
                    SELECT id, name, max_marks
                    FROM assessment_criterias
                    WHERE subject = ? AND year = ? AND quarter = ? AND class = ?
                `;

                // Execute the query
                const [results] = await db.execute(query, [subject, year, quarter,className]);

                // Check if results are found
                if (results.length === 0) {
                    return res.status(404).json({
                        message: 'No assessment criterias found for the given filters.',
                    });
                }

                // Return the filtered data
                return res.status(200).json({
                    message: 'Assessment criterias retrieved successfully',
                    assessments: results,
                });
            } catch (err) {
                console.error('Error retrieving assessment criterias:', err);

                return res.status(500).json({
                    message: 'Server error while fetching assessment criterias',
                    error: err.message,
                });
            }
        });

//--------------------------------------------------------------------------------------------------------------------------------------------------
        app.post('/api/assessment_criterias', async (req, res) => {
            const { year, quarter, subject,className } = req.headers; 
            const { max_marks, name } = req.body; 

            // Validate required fields
            if (!year || !quarter || !subject || !max_marks || !className || !name) {
                return res.status(400).json({
                    message: 'Missing required fields. Ensure year, quarter,class, subject (headers), and max_marks, name (body) are provided.',
                });
            }

            try {
                // SQL query to insert data into the table
                const insertQuery = `
                    INSERT INTO assessment_criterias (name, max_marks, year, quarter, subject,class)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                // Execute the query
                const [result] = await db.execute(insertQuery, [
                    name,
                    max_marks,
                    year,
                    quarter,
                    subject,
                    className
                ]);

                // Return success response
                return res.status(201).json({
                    message: 'Assessment criterion added successfully',
                    insertedId: result.insertId, // Return the ID of the inserted record
                });
            } catch (err) {
                console.error('Error inserting assessment criteria:', err);

                // Handle database-specific errors
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        message: 'Duplicate entry. This assessment criterion already exists.',
                    });
                }

                return res.status(500).json({
                    message: 'Server error while inserting assessment criteria',
                    error: err.message,
                });
            }
        });

        //--------------------------------------------------------------------------------------------------------------------------------------------------
        app.post("/api/ac_scores", async (req, res) => {
            try {
                // Extracting headers
                const { year, quarter, classname, subject } = req.headers;

                // Extracting obtained marks from the body
                const { obtained_marks, student_id, ac_id } = req.body;

                // Input validation
                if (!obtained_marks || !student_id || !ac_id) {
                    return res.status(400).json({ error: "obtained_marks, student_id and ac_id is required in the body" });
                }
                if (!year || !quarter || !classname || !subject) {
                    return res.status(400).json({ error: "year, quarter, subject are required in the headers" });
                }

                // Fetch the assessment criteria using ac_id
                const [criteriaRows] = await db.query(
                    "SELECT max_marks FROM assessment_criterias WHERE id = ? AND subject = ? AND quarter = ? AND year = ? AND classname = ?" ,
                    [ac_id, subject, quarter, year, classname]
                );

                // If no matching criteria is found
                if (criteriaRows.length === 0) {
                    return res.status(404).json({ error: "Assessment criteria not found for the given parameters" });
                }

                // Fetching max_marks for normalization
                const max_marks = criteriaRows[0].max_marks;

                if(obtained_marks > max_marks){
                    return res.status(404).json({ error: "Obtained Marks cannot be greater than Maximum marks of the Assessment" });
                }
                // Calculate normalized marks
                const normalized_marks = obtained_marks / max_marks;

                // Insert normalized score into ac_scores table
                const [result] = await db.query(
                    "INSERT INTO ac_scores (student_id, ac_id, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?",
                    [student_id, ac_id, normalized_marks, normalized_marks]
                );

                // Respond with success message
                res.status(201).json({
                    message: "Normalized score saved successfully"
                });
            } catch (error) {
                console.error("Error adding normalized score:", error.message);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });

        //--------------------------------------------------------------------------------------------------------------------------------------------------
        app.get('/api/ac_scores', async (req, res) => {
            const { student_id, ac_id } = req.headers; // Extract headers
            // Validate input
            if (!student_id || !ac_id) {
                return res.status(400).json({
                    message: 'Invalid input. Student ID (student_id) and Assessment Criteria ID (ac_id) are required.',
                });
            }

            try {
                // Query to fetch the score
                const query = `
                    SELECT student_id, ac_id, value
                    FROM ac_scores
                    WHERE student_id = ? AND ac_id = ? 
                `;
                const [results] = await db.execute(query, [student_id, ac_id]);

                if (results.length === 0) {
                    // No record found
                    return res.status(404).json({
                        message: 'No score found for the given Student ID and Assessment Criteria ID.',
                    });
                }

                // Return the score
                return res.status(200).json({
                    message: 'Score fetched successfully.',
                    score: results[0], // Return the first (and only) record
                });
            } catch (err) {
                console.error('Error fetching score:', err);

                return res.status(500).json({
                    message: 'Server error while fetching score.',
                    error: err.message,
                });
            }
        });
        const priorityValues = {
            h: 0.5,
            m: 0.3,
            l: 0.2,
        };
        app.post("/api/lo_ac_mapping", async (req, res) => {
            try {
                // Extract headers
                const subject = req.headers["subject"];
                const quarter = req.headers["quarter"];
                const year = req.headers["year"];
                const className = req.headers["class"];
                const section = req.headers["section"];
                // Extract and validate data from the request body
                const { lo_id, data } = req.body;
                console.log("dartaaa....")
                console.log(req.body.data[0].mappings)
                console.log(req.headers)
                if (!data || !Array.isArray(data) || data.length === 0) {
                    return res.status(400).json({ error: "Invalid data format. Expected an array of objects with ac_id and priority." });
                }
                // Validate priority values
                const validPriorities = ["h", "m", "l"];
                for (const item of data) {
                    if (!validPriorities.includes(item.priority)) {
                        return res.status(400).json({ error: `Invalid priority '${item.priority}'. Must be 'h', 'm', or 'l'.` });
                    }
                }
                // Validate `lo_id`
                const [loRows] = await db.query(`SELECT id FROM learning_outcomes WHERE id = ?`, [lo_id]);
                if (loRows.length === 0) {
                    return res.status(404).json({ error: "Invalid lo_id provided." });
                }
                // Fetch student IDs from `students_records`
                const [studentRows] = await db.query(
                    `SELECT student_id FROM students_records WHERE year = ${year} AND class = ${className} AND section = ${section}`
                );
                console.log(studentRows)
                if (studentRows.length === 0) {
                    return res.status(404).json({ error: "No students found in students_records for the given filters." });
                }
                const studentIds = studentRows.map(row => row.student_id);
                // Extract ac_ids from the request data
                const inputAcIds = data.map(item => item.ac_id);
                // Validate provided ac_ids
                const [validAcRows] = await db.query(
                    `SELECT id AS ac_id FROM assessment_criterias WHERE id IN (?) AND subject = ? AND quarter = ? AND classname = ?`,
                    [inputAcIds, subject, quarter, classname]
                );
                const validAcIds = validAcRows.map(row => row.ac_id);
                if (validAcIds.length !== inputAcIds.length) {
                    return res.status(404).json({ error: "Some provided ac_ids are invalid or do not match filters." });
                }
                // Calculate total denominator for weights
                let totalDenominator = 0;
                data.forEach(item => {
                    totalDenominator += priorityValues[item.priority];
                });
                if (totalDenominator === 0) {
                    return res.status(400).json({ error: "Invalid weight calculation, check input values." });
                }
                // Insert weights into `lo_ac_mapping`
                const loAcMappingPromises = data.map(async (item) => {
                    const { ac_id, priority } = item;
                    let weight = priorityValues[priority] / totalDenominator;
                    await db.query(
                        "INSERT INTO lo_ac_mapping (lo_id, ac_id, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = ?",
                        [lo_id, ac_id, weight, weight]
                    );
                    return { ac_id, weight };
                });
                // Resolve all weight calculations
                const mappings = await Promise.all(loAcMappingPromises);
                // Process lo_scores for each student
                for (const student_id of studentIds) {
                    let loScore = 0;
                    for (const mapping of mappings) {
                        const { ac_id, weight } = mapping;
                        // Fetch `value` from `ac_scores`
                        const [acScoreRows] = await db.query(
                            "SELECT value FROM ac_scores WHERE ac_id = ? AND student_id = ?",
                            [ac_id, student_id]
                        );
                        if (acScoreRows.length === 0) {
                            console.warn(`Missing ac_scores for ac_id: ${ac_id}, student_id: ${student_id}`);
                            continue;
                        }
                        const { value } = acScoreRows[0];
                        loScore += weight * value;
                    }
                    // Insert or update `lo_scores`
                    await db.query(
                        "INSERT INTO lo_scores (lo_id, student_id, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?",
                        [lo_id, student_id, loScore, loScore]
                    );
                }
                res.status(201).json({
                    message: "LO and AC mapping with weights saved successfully",
                    students_processed: studentIds.length,
                });
            } catch (error) {
                console.error("Error mapping LO and AC:", error.message);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });
        //--------------------------------------------------------------------------------------------------------------------------------------------------
        app.post("/api/ro_lo_mapping", async (req, res) => {
            try {
                // Extract headers
                const subject = req.headers["subject"];
                const quarter = req.headers["quarter"];
                const year = req.headers["year"];
                const className = req.headers["class"];
                const section = req.headers["section"];
                // Extract and validate data from request body
                const { ro_id, data } = req.body;
                if (!data || !Array.isArray(data) || data.length === 0) {
                    return res.status(400).json({ error: "Invalid data format. Expected an array of objects with lo_id and priority." });
                }
                // Validate priority values
                const validPriorities = ["h", "m", "l"];
                for (const item of data) {
                    if (!validPriorities.includes(item.priority)) {
                        return res.status(400).json({ error: `Invalid priority '${item.priority}'. Must be 'h', 'm', or 'l'.` });
                    }
                }
                // Validate `ro_id`
                const [roRows] = await db.query("SELECT id FROM report_outcomes WHERE id = ?", [ro_id]);
                if (roRows.length === 0) {
                    return res.status(404).json({ error: "Invalid ro_id provided." });
                }
                // Fetch student IDs from `students_records`
                const [studentRows] = await db.query(
                    `SELECT student_id FROM students_records WHERE year = ${year} AND class = ${className} AND section = ${section}`
                );
                if (studentRows.length === 0) {
                    return res.status(404).json({ error: "No students found in students_records for the given filters." });
                }
                const studentIds = studentRows.map(row => row.student_id);
                // Extract lo_ids from the request data
                const inputLoIds = data.map(item => item.lo_id);
                // Validate provided lo_ids
                const [validLoRows] = await db.query(
                    "SELECT id AS lo_id FROM learning_outcomes WHERE id IN (?) AND subject = ? AND quarter = ? AND classname = ?",
                    [inputLoIds, subject, quarter, classname]
                );
                const validLoIds = validLoRows.map(row => row.lo_id);
                if (validLoIds.length !== inputLoIds.length) {
                    return res.status(404).json({ error: "Some provided lo_ids are invalid or do not match filters." });
                }
                // Calculate total denominator for weights
                let totalDenominator = 0;
                data.forEach(item => {
                    totalDenominator += priorityValues[item.priority];
                });
                if (totalDenominator === 0) {
                    return res.status(400).json({ error: "Invalid weight calculation, check input values." });
                }
                // Insert weights into `ro_lo_mapping`
                const roLoMappingPromises = data.map(async (item) => {
                    const { lo_id, priority } = item;
                    let weight = priorityValues[priority] / totalDenominator;
                    await db.query(
                        "INSERT INTO ro_lo_mapping (ro_id, lo_id, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = ?",
                        [ro_id, lo_id, weight, weight]
                    );
                    return { lo_id, weight };
                });
                // Resolve all weight calculations
                const mappings = await Promise.all(roLoMappingPromises);
                // Process ro_scores for each student
                for (const student_id of studentIds) {
                    let roScore = 0;
                    for (const mapping of mappings) {
                        const { lo_id, weight } = mapping;
                        // Fetch `value` from `lo_scores`
                        const [loScoreRows] = await db.query(
                            "SELECT value FROM lo_scores WHERE lo_id = ? AND student_id = ?",
                            [lo_id, student_id]
                        );
                        if (loScoreRows.length === 0) {
                            console.warn(`Missing lo_scores for lo_id: ${lo_id}, student_id: ${student_id}`);
                            continue;
                        }
                        const { value } = loScoreRows[0];
                        roScore += weight * value;
                    }
                    // Insert or update `ro_scores`
                    await db.query(
                        "INSERT INTO ro_scores (ro_id, student_id, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?",
                        [ro_id, student_id, roScore, roScore]
                    );
                }
                res.status(201).json({
                    message: "RO and LO mapping with weights saved successfully",
                    students_processed: studentIds.length,
                });
            } catch (error) {
                console.error("Error mapping RO and LO:", error.message);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });
        //--------------------------------------------------------------------------------------------------------------------------------------------------
        app.get("/api/lo_scores", async (req, res) => {
            try {
                // Extract student_id and lo_id from headers
                const { student_id } = req.headers;
                // Validation check for student_id
                if (!student_id) {
                    return res.status(400).json({
                        error: "student_id header is required.",
                    });
                }
                let query = `SELECT ls.student_id, ls.lo_id, ls.value FROM lo_scores ls WHERE ls.student_id = ?`;
                let queryParams = [student_id];
                // If lo_id is provided, filter results by lo_id
                // Fetch lo_scores based on student_id (and optional lo_id)
                const [loScores] = await db.query(query, queryParams);
                if (loScores.length === 0) {
                    return res.status(404).json({
                        error: "No lo_scores found for the provided student_id.",
                    });
                }
                // Send the response with lo_scores data
                res.status(200).json({
                    lo_scores: loScores,
                });
            } catch (error) {
                console.error("Error fetching lo_scores:", error.message);
                res.status(500).json({
                    error: "Internal Server Error",
                });
            }
        });

        //--------------------------------------------------------------------------------------------------------------------------------------------------
        app.get("/api/ro_scores", async (req, res) => {
            try {
                // Extract student_id from headers
                const { student_id } = req.headers;
                // Validation check for student_id
                if (!student_id) {
                    return res.status(400).json({
                        error: "student_id header is required.",
                    });
                }
                // Fetch all ro_scores based on student_id
                const [roScores] = await db.query(
                    `SELECT rs.student_id, rs.ro_id, rs.value
                    FROM ro_scores rs
                    WHERE rs.student_id = ?`,
                    [student_id]
                );
                if (roScores.length === 0) {
                    return res.status(404).json({
                        error: "No ro_scores found for the provided student_id.",
                    });
                }
                // Send the response with ro_scores data
                res.status(200).json({
                    ro_scores: roScores,
                });
            } catch (error) {
                console.error("Error fetching ro_scores:", error.message);
                res.status(500).json({
                    error: "Internal Server Error",
                });
            }
        });        
                

        //--------------------------------------------------------------------------------------------------------------------------------------------------

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (err) {
        console.error("Error connecting to the database:", err.message);
    }
})();
