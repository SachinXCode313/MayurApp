import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(cors());


const priorityValues = {
    h: 0.5,
    m: 0.3,
    l: 0.2
};


// Use async/await properly
(async () => {
    try {
        const db = await mysql.createPool({
            host: "localhost", // Change to your DB host
            user: "root",      // Change to your DB username
            password: "sachin@313", // Change to your DB password
            database: "mayoor", // Change to your database name
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });

        console.log("Connected to the database");

        // Define APIs inside the async block to ensure `db` is initialized

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

        app.post('/api/newstudents', async (req, res) => {
            const year = req.headers['year'];
            const className = req.headers['class'];
            const section = req.headers['section'];
            const studentName = req.body.studentName;
            console.log(year, className, section, studentName)
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
                console.log('Student and record inserted successfully');
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


        //-------------------------------------------------------------------------------------------------------------------
        // Get API for report_outcomes
        //-------------------------------------------------------------------------------------------------------------------
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

        //-------------------------------------------------------------------------------------------------------------------
        // POST learning_outcomes
        //-------------------------------------------------------------------------------------------------------------------
        app.post("/api/learning_outcomes", async (req, res) => {
            const { year, quarter, subject } = req.headers;
            const { name } = req.body;

            if (!year || !quarter || !subject || !name) {
                return res.status(400).json({
                    message: "Missing required fields: year, quarter, subject (headers) or name (body).",
                });
            }

            try {
                const query = `
            INSERT INTO learning_outcomes (name, year, quarter, subject) 
            VALUES (?, ?, ?, ?)
            `;
                const [result] = await db.execute(query, [name, year, quarter, subject]);

                res.status(201).json({
                    message: "Learning outcome added successfully",
                    insertedId: result.insertId,
                });
            } catch (err) {
                console.error("Error inserting learning outcome:", err);
                res.status(500).json({ message: "Server error", error: err.message });
            }
        });

        //-------------------------------------------------------------------------------------------------------------------
        // GET learning_outcomes
        //-------------------------------------------------------------------------------------------------------------------
        app.get("/api/learning_outcomes", async (req, res) => {
            const { year, subject, quarter } = req.headers;

            if (!year || !subject || !quarter) {
                return res.status(400).json({ message: "Missing required headers: year, subject, or quarter" });
            }

            try {
                const query = `
            SELECT id, name 
            FROM learning_outcomes 
            WHERE year = ? AND subject = ? AND quarter = ?
            `;
                const [results] = await db.execute(query, [year, subject, quarter]);

                if (results.length === 0) {
                    return res.status(404).json({ message: "No learning outcomes found for the provided filters" });
                }

                res.status(200).json(results);
            } catch (err) {
                console.error("Error fetching learning outcomes:", err);
                res.status(500).json({ message: "Internal server error" });
            }
        });
        //---------------------------------------------------------------------------------------------------------------------
        // GET Assessment_criterias
        //---------------------------------------------------------------------------------------------------------------------
        app.get('/api/assessment_criterias', async (req, res) => {
            const { subject, year, quarter } = req.headers; // Extract headers

            console.log(`Subject: ${subject}, Year: ${year}, Quarter: ${quarter}`);

            // Validate input
            if (!subject || !year || !quarter) {
                return res.status(400).json({
                    message: 'Invalid input. Subject, Year, and Quarter are required in the headers.',
                });
            }

            try {
                // SQL query to fetch assessment_criterias based on filters
                const query = `
                    SELECT id, name, max_marks
                    FROM assessment_criterias
                    WHERE subject = ? AND year = ? AND quarter = ?
                `;

                // Execute the query
                const [results] = await db.execute(query, [subject, year, quarter]);

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
        //-------------------------------------------------------------------------------------------------------------------
        // POST Assessment_criterias
        app.post('/api/assessment_criterias', async (req, res) => {
            const { year, quarter, subject } = req.headers; // Extract headers
            const { max_marks, name } = req.body; // Extract body parameters

            // Validate required fields
            if (!year || !quarter || !subject || !max_marks || !name) {
                return res.status(400).json({
                    message: 'Missing required fields. Ensure year, quarter, subject (headers), and max_marks, name (body) are provided.',
                });
            }

            try {
                // SQL query to insert data into the table
                const insertQuery = `
                    INSERT INTO assessment_criterias (name, max_marks, year, quarter, subject)
                    VALUES (?, ?, ?, ?, ?)
                `;

                // Execute the query
                const [result] = await db.execute(insertQuery, [
                    name,
                    max_marks,
                    year,
                    quarter,
                    subject,
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
        //-------------------------------------------------------------------------------------------------------------------
        // POST API to add normalized score for a student
        app.post("/api/ac_scores", async (req, res) => {
            try {
                // Extracting headers
                const { year, quarter, className, section, subject } = req.headers;
        
                // Extracting obtained marks from the body
                const { student_id, ac_id, obtained_marks } = req.body;
        
                // Input validation
                if (!obtained_marks) {
                    return res.status(400).json({ error: "obtained_marks is required in the body" });
                }
                if (!student_id || !ac_id) {
                    return res.status(400).json({ error: "student_id and ac_id are required in the headers" });
                }
        
                const [studentRows] = await db.query(
                    `SELECT student_id FROM students_records 
                     WHERE student_id = ? AND year = ? AND class = ? AND section = ?`,
                    [student_id, year, className, section]
                );
        
                // Fetch the assessment criteria using ac_id
                const [criteriaRows] = await db.query(
                    `SELECT max_marks FROM assessment_criterias WHERE id = ? AND subject = ? AND quarter = ? AND year = ?`,
                    [ac_id, subject, quarter, year]
                );
        
                // If no matching criteria is found
                if (criteriaRows.length === 0) {
                    return res.status(404).json({ error: "Assessment criteria not found for the given parameters" });
                }
        
                // Fetching max_marks for normalization
                const max_marks = criteriaRows[0].max_marks;
        
                // Calculate normalized marks
                if(obtained_marks > max_marks){
                    return res.status(404).json({ error: "Obtained Marks is greater than Maximum Marks of Assessment criteria" })
                }
                const normalized_marks = obtained_marks / max_marks;
        
                // Insert normalized score into ac_scores table
                await db.query(
                    `INSERT INTO ac_scores (student_id, ac_id, value) 
                     VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?`,
                    [student_id, ac_id, normalized_marks, normalized_marks]
                );
        
                // Fetch LO-AC mappings
                const [loAcMappingRows] = await db.query(
                    `SELECT lo_id, weight FROM lo_ac_mapping WHERE ac_id = ?`,
                    [ac_id]
                );
        
                if (loAcMappingRows.length === 0) {
                    return res.status(404).json({ error: "No mapping found for the provided ac_id" });
                }
        
                // Loop through all mappings and calculate/store LO_scores
                for (let i = 0; i < loAcMappingRows.length; i++) {
                    const { lo_id, weight } = loAcMappingRows[i];
        
                    // Calculate LO score for the specific mapping
                    const lo_score = weight * normalized_marks;
        
                    // Insert or update LO score in lo_scores table
                    await db.query(
                        `INSERT INTO lo_scores (student_id, lo_id, value) 
                         VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?`,
                        [student_id, lo_id, lo_score, lo_score]
                    );
                }
        
                // Success response
                res.status(201).json({
                    message: "Normalized score and LO scores saved successfully",
                    data: {
                        student_id,
                        ac_id,
                        normalized_marks,
                        lo_scores: loAcMappingRows.map(({ lo_id }) => ({
                            lo_id,
                            lo_score: normalized_marks * loAcMappingRows.find(m => m.lo_id === lo_id).weight
                        })),
                    },
                });
            } catch (error) {
                console.error("Error adding normalized score:", error.message);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });
        
        //---------------------------------------------------------------------------------------------------------------------
        // GET ac_scores
        //---------------------------------------------------------------------------------------------------------------------
        app.get('/api/ac_scores', async (req, res) => {
            const { student_id, ac_id } = req.headers; // Extract headers

            console.log(`Fetching score for Student ID: ${student_id}, Assessment Criteria ID: ${ac_id}`);

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
        //---------------------------------------------------------------------------------------------------------------------
        // POST lo_ac_mapping
        //---------------------------------------------------------------------------------------------------------------------
        const priorityValues = {
            h: 0.5,
            m: 0.3,
            l: 0.2,
        };
        app.post("/api/lo_ac_mapping", async (req, res) => {
            try {
                // Extract filters from headers
                const lo_id = req.headers['lo_id'];
                const subject = req.headers['subject'];
                const quarter = req.headers['quarter'];
                const year = req.headers['year'];
                // Extract data from the body (JSON)
                const { data } = req.body; // This should be an array with each element containing ac_id and priority (h, m, l)
                // Validation check for data
                if (!data || !Array.isArray(data) || data.length === 0) {
                    return res.status(400).json({ error: "Invalid data format. Expected an array of objects with ac_id and priority." });
                }
                const validPriorities = ["h", "m", "l"];
                for (const item of data) {
                    const { priority } = item;
                    if (!validPriorities.includes(priority)) {
                        return res.status(400).json({ error: `Invalid priority value '${priority}'. Priority must be one of: 'h', 'm', or 'l'.` });
                    }
                }
                // Step 1: Validate `lo_id` from headers
                const [loRows] = await db.query(
                    `SELECT id AS lo_id FROM learning_outcomes WHERE id = ?`,
                    [lo_id]
                );
                if (loRows.length === 0) {
                    return res.status(404).json({ error: "Invalid lo_id provided in the headers." });
                }
                // Step 2: Fetch relevant assessment_criterias based on subject, quarter, and year
                const [acRows] = await db.query(
                    `SELECT id AS ac_id FROM assessment_criterias WHERE subject = ? AND quarter = ? AND year = ?`,
                    [subject, quarter, year]
                );
                if (acRows.length === 0) {
                    return res.status(404).json({ error: "No matching assessment criteria found for the provided filters." });
                }
                const acIds = acRows.map(row => row.ac_id); 
                console.log(acIds)// Extract ac_id
                // Step 3: Calculate priority occurrences
                let hOccurance = 0, mOccurance = 0, lOccurance = 0;
                data.forEach(item => {
                    const { ac_id, priority } = item;
                    if (priority === "h") {
                        hOccurance++;
                    } else if (priority === "m") {
                        mOccurance++;
                    } else{
                        lOccurance++;
                    }
                });
                const totalDenominator = (priorityValues.h * hOccurance) + (priorityValues.m * mOccurance) + (priorityValues.l * lOccurance);
                // Check if we have valid data for calculating weights
                if (totalDenominator === 0) {
                    return res.status(400).json({ error: "The total denominator for weight calculation is zero. Check input values." });
                }
                // Step 5: Process mappings for each ac_id with the specified lo_id
                const loAcMappingPromises = acIds.map(async ac_id => {
                    // Initialize weight variables
                    let hWeight = 0, mWeight = 0, lWeight = 0;
                    // Calculate weights for h, m, l based on occurrences
                    if (hOccurance > 0) {
                        hWeight = (priorityValues.h) / totalDenominator;
                    }
                    if (mOccurance > 0) {
                        mWeight = (priorityValues.m) / totalDenominator;
                    }
                    if (lOccurance > 0) {
                        lWeight = (priorityValues.l) / totalDenominator;
                    }
                    // Insert into lo_ac_mapping table only for relevant weights
                    const weights = [
                        { weight: hWeight, occurrence: hOccurance },
                        { weight: mWeight, occurrence: mOccurance },
                        { weight: lWeight, occurrence: lOccurance },
                    ];
                    await Promise.all(weights.map(async ({ weight, occurrence }) => {
                        if (weight > 0 && occurrence > 0) {
                            await db.query(
                                "INSERT INTO lo_ac_mapping (lo_id, ac_id, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = ?",
                                [lo_id, ac_id, weight, weight]
                            );
                        }
                    }));
                });
                // Wait for all insert operations to complete
                console.log(lo_id, acIds)
                await Promise.all(loAcMappingPromises);
                res.status(201).json({
                    message: "LO and AC mapping with weights saved successfully",
                });
            } catch (error) {
                console.error("Error mapping LO and AC:", error.message);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });
        app.post("/api/ro_lo_mapping", async (req, res) => {
            try {
                // Extract filters from headers
                const { subject, year } = req.headers;
                // Extract data from the body (JSON)
                const { data } = req.body; // Array with each element containing lo_id and priority (h, m, l)
                // Validation check for data
                if (!data || !Array.isArray(data) || data.length === 0) {
                    return res.status(400).json({
                        error: "Invalid data format. Expected an array of objects with lo_id and priority.",
                    });
                }
                // Fetch relevant report_outcomes (RO) based on filters
                const [roRows] = await db.query(
                    `SELECT ro.id AS ro_id
                    FROM report_outcomes ro
                    WHERE ro.subject = ? AND ro.year = ?`,
                    [subject, year]
                );
                if (roRows.length === 0) {
                    return res.status(404).json({
                        error: "No matching RO records found for the provided filters.",
                    });
                }
                // Calculate priority occurrences
                let hOccurance = 0, mOccurance = 0, lOccurance = 0;
                // Process input data and calculate total occurrences
                data.forEach(item => {
                    const { lo_id, priority } = item;
                    if (priority === "h") {
                        hOccurance++;
                    } else if (priority === "m") {
                        mOccurance++;
                    } else if (priority === "l") {
                        lOccurance++;
                    }
                });
                // Calculate the total denominator
                const totalDenominator = (priorityValues.h * hOccurance) + (priorityValues.m * mOccurance) + (priorityValues.l * lOccurance);
                // Check if we have valid data for calculating weights
                if (totalDenominator === 0) {
                    return res.status(400).json({
                        error: "The total denominator for weight calculation is zero. Check input values.",
                    });
                }
                // Calculate weight for each RO and LO pair based on priority
                const roLoMappingPromises = data.map(async (item) => {
                    const { lo_id, priority } = item;
                    // Calculate weight for the given priority
                    const weight = priorityValues[priority] / totalDenominator;
                    // Insert into ro_lo_mapping table for each RO and LO pair
                    const insertPromises = roRows.map(async (roRow) => {
                        const { ro_id } = roRow;
                        await db.query(
                            "INSERT INTO ro_lo_mapping (ro_id, lo_id, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = ?",
                            [ro_id, lo_id, weight, weight]
                        );
                    });
                    await Promise.all(insertPromises);
                });
                // Wait for all insert operations to complete
                await Promise.all(roLoMappingPromises);
                res.status(201).json({
                    message: "RO and LO mapping with weights saved successfully",
                });
            } catch (error) {
                console.error("Error mapping RO and LO:", error.message);
                res.status(500).json({
                    error: "Internal Server Error",
                });
            }
        });
        app.post("/api/ro_lo_mapping", async (req, res) => {
            try {
                // Extract filters from headers
                const { subject, year } = req.headers;
                // Extract data from the body (JSON)
                const { data } = req.body; // Array with each element containing lo_id and priority (h, m, l)
                // Validation check for data
                if (!data || !Array.isArray(data) || loRows.length === 0 || (lo_id !== "l" && lo_id !== "h" && lo_id !== "m")) {
                    return res.status(400).json({
                        error: "Invalid data format. Expected an array of objects with lo_id and priority.",
                    });
                }
                // Fetch relevant report_outcomes (RO) based on filters
                const [roRows] = await db.query(
                    `SELECT ro.id AS ro_id
                    FROM report_outcomes ro
                    WHERE ro.subject = ? AND ro.year = ?`,
                    [subject, year]
                );
                if (roRows.length === 0) {
                    return res.status(404).json({
                        error: "No matching RO records found for the provided filters.",
                    });
                }
                // Calculate priority occurrences
                let hOccurance = 0, mOccurance = 0, lOccurance = 0;
                // Process input data and calculate total occurrences
                data.forEach(item => {
                    const { lo_id, priority } = item;
                    if (priority === "h") {
                        hOccurance++;
                    } else if (priority === "m") {
                        mOccurance++;
                    } else if (priority === "l") {
                        lOccurance++;
                    }
                });
                // Calculate the total denominator
                const totalDenominator = (priorityValues.h * hOccurance) + (priorityValues.m * mOccurance) + (priorityValues.l * lOccurance);
                // Check if we have valid data for calculating weights
                if (totalDenominator === 0) {
                    return res.status(400).json({
                        error: "The total denominator for weight calculation is zero. Check input values.",
                    });
                }
                // Calculate weight for each RO and LO pair based on priority
                const roLoMappingPromises = data.map(async (item) => {
                    const { lo_id, priority } = item;
                    // Calculate weight for the given priority
                    const weight = priorityValues[priority] / totalDenominator;
                    // Insert into ro_lo_mapping table for each RO and LO pair
                    const insertPromises = roRows.map(async (roRow) => {
                        const { ro_id } = roRow;
                        await db.query(
                            "INSERT INTO ro_lo_mapping (ro_id, lo_id, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = ?",
                            [ro_id, lo_id, weight, weight]
                        );
                    });
                    await Promise.all(insertPromises);
                });
                // Wait for all insert operations to complete
                await Promise.all(roLoMappingPromises);
                res.status(201).json({
                    message: "RO and LO mapping with weights saved successfully",
                });
            } catch (error) {
                console.error("Error mapping RO and LO:", error.message);
                res.status(500).json({
                    error: "Internal Server Error",
                });
            } 
        });
        //---------------------------------------------------------------------------------------------------------------------
        // POST ro_lo_mapping
        //---------------------------------------------------------------------------------------------------------------------

        app.post("/api/ro_lo_mapping", async (req, res) => {
            try {
                // Extract filters from headers
                const { subject, year } = req.headers;

                // Extract data from the body (JSON)
                const { data } = req.body; // Array with each element containing lo_id and priority (h, m, l)

                // Validation check for data
                if (!data || !Array.isArray(data) || data.length === 0) {
                    return res.status(400).json({
                        error: "Invalid data format. Expected an array of objects with lo_id and priority.",
                    });
                }

                // Fetch relevant report_outcomes (RO) based on filters
                const [roRows] = await db.query(
                    `SELECT ro.id AS ro_id
                     FROM report_outcomes ro
                     WHERE ro.subject = ? AND ro.year = ?`,
                    [subject, year]
                );

                if (roRows.length === 0) {
                    return res.status(404).json({
                        error: "No matching RO records found for the provided filters.",
                    });
                }

                // Calculate priority occurrences
                let hOccurance = 0, mOccurance = 0, lOccurance = 0;

                // Process input data and calculate total occurrences
                data.forEach(item => {
                    const { lo_id, priority } = item;
                    if (priority === "h") {
                        hOccurance++;
                    } else if (priority === "m") {
                        mOccurance++;
                    } else if (priority === "l") {
                        lOccurance++;
                    }
                });

                // Calculate the total denominator
                const totalDenominator = (priorityValues.h * hOccurance) + (priorityValues.m * mOccurance) + (priorityValues.l * lOccurance);

                // Check if we have valid data for calculating weights
                if (totalDenominator === 0) {
                    return res.status(400).json({
                        error: "The total denominator for weight calculation is zero. Check input values.",
                    });
                }

                // Calculate weight for each RO and LO pair based on priority
                const roLoMappingPromises = data.map(async (item) => {
                    const { lo_id, priority } = item;

                    // Calculate weight for the given priority
                    const weight = priorityValues[priority] / totalDenominator;

                    // Insert into ro_lo_mapping table for each RO and LO pair
                    const insertPromises = roRows.map(async (roRow) => {
                        const { ro_id } = roRow;

                        await db.query(
                            "INSERT INTO ro_lo_mapping (ro_id, lo_id, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = ?",
                            [ro_id, lo_id, weight, weight]
                        );
                    });

                    await Promise.all(insertPromises);
                });

                // Wait for all insert operations to complete
                await Promise.all(roLoMappingPromises);

                res.status(201).json({
                    message: "RO and LO mapping with weights saved successfully",
                });
            } catch (error) {
                console.error("Error mapping RO and LO:", error.message);
                res.status(500).json({
                    error: "Internal Server Error",
                });
            }
        });




        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (err) {
        console.error("Error connecting to the database:", err.message);
    }
})();
