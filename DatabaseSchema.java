CREATE TABLE subjects (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE report_outcomes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject INT,
    year INT,
    FOREIGN KEY (subject) REFERENCES subjects(id)
);

CREATE TABLE learning_outcomes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject INT,
    quarter INT,
    year INT,
    FOREIGN KEY (subject) REFERENCES subjects(id)
);

CREATE TABLE assessment_criterias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    max_marks INT,
    subject INT,
    quarter INT,
    year INT,
    FOREIGN KEY (subject) REFERENCES subjects(id)
);

CREATE TABLE students (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE students_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT ,
    class INT,
    section VARCHAR(20),
    year INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE lo_ac_mapping (
    lo_id INT,
    ac_id INT,
    priority VARCHAR(10),
    PRIMARY KEY (lo_id,ac_id),
    FOREIGN KEY (lo_id) REFERENCES learning_outcome(id),
    FOREIGN KEY (ac_id) REFERENCES assessment_criteria(id)
);

CREATE TABLE ro_lo_mapping (
    ro_id INT,
    lo_id INT,
    priority VARCHAR(10),
    PRIMARY KEY (ro_id,lo_id),
    FOREIGN KEY (ro_id) REFERENCES report_outcome(id),
    FOREIGN KEY (lo_id) REFERENCES assessment_criteria(id)
);

CREATE TABLE ac_scores (
    student_id INT,
    ac_id INT,
    value DECIMAL(5, 2),
    PRIMARY KEY (student_id, ac_id),
    FOREIGN KEY (student_id) REFERENCES students_record(id),
    FOREIGN KEY (ac_id) REFERENCES assessment_criteria(id)
);

CREATE TABLE lo_scores (
    student_id INT,
    lo_id INT,
    value DECIMAL(5, 2),
    PRIMARY KEY (student_id, lo_id),
    FOREIGN KEY (student_id) REFERENCES students_record(id),
    FOREIGN KEY (lo_id) REFERENCES learning_outcome(id)
);

CREATE TABLE ro_scores (
    student_id INT,
    ro_id INT,
    value DECIMAL(5, 2),
    PRIMARY KEY (student_id, ro_id),
    FOREIGN KEY (student_id) REFERENCES students_record(id),
    FOREIGN KEY (ro_id) REFERENCES report_outcome(id)
);
