SET NAMES utf8mb4;

-- CREATE DATABASE is not permitted on the instructor server; use existing DB ip_std6730202645
-- CREATE DATABASE IF NOT EXISTS ip_std6730202645 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE ip_std6730202645;

CREATE TABLE IF NOT EXISTS Tharatap_employees (
  Tharatap_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Tharatap_name VARCHAR(100) NOT NULL,
  Tharatap_position VARCHAR(100) NOT NULL,
  Tharatap_status ENUM('Active','On Leave') NOT NULL DEFAULT 'Active',
  Tharatap_salary DECIMAL(10,2) NOT NULL,
  Tharatap_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
