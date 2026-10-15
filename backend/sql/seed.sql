SET NAMES utf8mb4;

-- Only touches Tharatap_employees_final_exam (DB is shared with another project). No TRUNCATE allowed.
DELETE FROM Tharatap_employees_final_exam;

INSERT INTO Tharatap_employees_final_exam (Tharatap_name, Tharatap_position, Tharatap_status, Tharatap_salary) VALUES
('Somchai Jaidee', 'Junior Developer', 'Active', 15000.00),
('Suda Rakdee', 'HR Assistant', 'On Leave', 18000.00),
('Anan Srisuk', 'Support Engineer', 'Active', 22000.00),
('Malee Wongsa', 'Accountant', 'Active', 45000.00),
('Krit Thongdee', 'Senior Developer', 'On Leave', 55000.00),
('Pim Chaiyo', 'Project Manager', 'Active', 60000.00),
('Wichai Boonmee', 'Engineering Manager', 'Active', 110000.00),
('Nida Kaewta', 'CTO', 'On Leave', 120000.00);
