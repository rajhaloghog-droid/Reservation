# MySQL Database Setup Guide

This project has been upgraded to use **MySQL** instead of JSON file storage. Follow these steps to set up your database.

## Prerequisites

1. **MySQL Server** installed and running
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use: `brew install mysql` (macOS) or `apt-get install mysql-server` (Linux)

2. **Node.js** (already installed)

## Setup Steps

### 1. Install Database Dependencies

Run this command in your project directory:

```bash
npm install mysql2
```

This will install the `mysql2` package with promise support.

### 2. Start MySQL Server

**Windows:**
```bash
# If installed as service, it should run automatically
# Or start it manually:
net start MySQL80
```

**macOS:**
```bash
brew services start mysql
```

**Linux:**
```bash
sudo systemctl start mysql
```

### 3. Create the Database

Open MySQL command line or use a tool like MySQL Workbench, then run:

```bash
mysql -u root -p < database.sql
```

Enter your MySQL root password when prompted.

**Or manually:**

1. Connect to MySQL:
   ```bash
   mysql -u root -p
   ```

2. Copy and paste the entire contents of `database.sql` file

3. Press Enter to execute all commands

### 4. Configure Database Connection

Edit the `db-config.js` file with your MySQL credentials:

```javascript
export const dbConfig = {
  host: 'localhost',        // MySQL server address
  user: 'root',             // MySQL username
  password: '',             // MySQL password (empty if none)
  database: 'reservation_system',
  port: 3306,               // Default MySQL port
  // ... rest of config
};
```

**Or use environment variables:**

```bash
# Windows PowerShell
$env:DB_HOST = "localhost"
$env:DB_USER = "root"
$env:DB_PASSWORD = "your_password"
$env:DB_NAME = "reservation_system"

# Linux/macOS
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=reservation_system
```

### 5. Start Your Server

```bash
npm run server
```

You should see:
```
✓ MySQL connection pool created
✓ Connected to MySQL database
✓ Server running on http://localhost:8000
```

## Database Schema

The database includes these tables:

### 1. **companies**
- Company management
- Fields: id, name, email, phone, address, timestamps

### 2. **users**
- User accounts with roles
- Fields: id, name, email, password, role (admin/user), company_id, is_active, timestamps

### 3. **vehicles**
- Vehicle information
- Fields: id, name, plate_number, brand, model, year, max_capacity, rental_rate, status, timestamps

### 4. **vehicle_availability**
- Track available time slots per vehicle per date
- Fields: id, vehicle_id, availability_date, time_slot, status, booked_by_user_id, timestamps

### 5. **reservations**
- Pending booking requests
- Fields: id, company_id, phone, address, reservation_date, start_time, end_time, status, requested_by_user_id, timestamps

### 6. **bookings**
- Confirmed bookings
- Fields: id, user_id, vehicle_id, booking_date, start_time, end_time, total_cost, status, notes, timestamps

## Testing the Connection

To verify MySQL is working:

```bash
mysql -u root -p -e "SELECT * FROM reservation_system.companies;"
```

## Default Users (Add these manually or via API)

After setup, you can add test users via the Admin Panel or manually:

```sql
USE reservation_system;

INSERT INTO users (name, email, password, role, is_active) VALUES 
('Admin User', 'admin@example.com', 'admin123', 'admin', TRUE),
```

## Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:3306"
- MySQL server is not running
- Check if MySQL is running on port 3306
- Try using 127.0.0.1 instead of localhost

### Error: "Access denied for user 'root'@'localhost'"
- Check your password in `db-config.js`
- Reset MySQL root password if needed

### Error: "Unknown database 'reservation_system'"
- Run the `database.sql` script to create the database
- Verify you ran: `mysql -u root -p < database.sql`

### Error: "Table doesn't exist"
- The `database.sql` script wasn't fully executed
- Delete the database and re-run the setup

### Port 3306 Already in Use
- Change the port in `db-config.js`
- Or stop the other MySQL instance

## Database Reset

To completely reset your database:

```bash
# Connect to MySQL
mysql -u root -p

# Drop the database
DROP DATABASE reservation_system;

# Exit
EXIT;

# Recreate it
mysql -u root -p < database.sql
```

## Important Notes

⚠️ **Security:**
- Never hardcode passwords in source code
- Use environment variables in production
- Hash passwords before storing (currently plaintext for demo)
- Implement proper authentication tokens

⚠️ **In Development:**
- The current login system stores plaintext passwords
- Add bcrypt or similar for password hashing in production

## Next Steps

1. ✅ Database is set up
2. Run: `npm run server`
3. Run: `npm run dev` (in another terminal) to start the frontend
4. Visit: http://localhost:5173
5. Use the Admin Panel to add companies and users

## Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [MySQL Workbench](https://www.mysql.com/products/workbench/)
- [Node.js MySQL2 Package](https://github.com/sidorares/node-mysql2)
