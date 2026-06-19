# Waste-to-Value Platform

A contract-based B2B waste management platform built with Laravel 13, Sanctum, and MySQL. This system facilitates the connection between factories and suppliers for waste repurposing, managed by an administrative layer.

## 🚀 Overview

This platform follows a strict B2B flow:
- **No Self-Registration:** All user accounts (Drivers, Factories, Suppliers, Hub Managers) are created by a SuperAdmin.
- **Lead System:** Prospective Factories and Suppliers submit interest via a public lead form (Applications).
- **Administrative Review:** SuperAdmins review applications and convert them into official user accounts upon contract signing.

## 🛠 Tech Stack

- **Framework:** Laravel 13
- **Authentication:** Laravel Sanctum
- **Database:** MySQL
- **API Documentation:** Dedoc Scramble
- **Testing:** Pest PHP
- **Formatting:** Laravel Pint

## 📋 Features

- **RBAC (Role-Based Access Control):**
  - `superadmin`: Full system management.
  - `driver`: Logistics and pickup management.
  - `factory`: Waste consumers (Required commodity tracking).
  - `supplier`: Waste providers.
  - `hub_manager`: Regional hub operations.
- **API Versioning:** v1 architecture.
- **Security Middleware:** 
  - Account activation check (`active`).
  - SuperAdmin verification (`superadmin`).
- **Interactive Documentation:** Automatic OpenAPI spec generation.

## ⚙️ Setup & Installation

### Prerequisites
- PHP 8.5+
- Composer
- Node.js & NPM
- MySQL

### 1. Clone the repository
```bash
git clone <repository-url>
cd waste-to-value
```

### 2. Install dependencies
```bash
composer install
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```
Update your `.env` file with your database credentials:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=waste_to_value
DB_USERNAME=root
DB_PASSWORD=
```

### 4. Key Generation & Migration
```bash
php artisan key:generate
php artisan migrate:fresh --seed
```
*Note: The seeder creates a default admin account:*
- **Email:** `admin@platform.com`
- **Password:** `changeme123`

### 5. Start the Application
```bash
php artisan serve
```

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation at:
[http://localhost:8000/docs/api](http://localhost:8000/docs/api)

This documentation provides details on all endpoints, including required body parameters and query filters.

## 🧪 Testing

### Automated Feature Tests (Pest)
Run the Pest test suite:
```bash
php artisan test
```

### Manual CURL Verification
We provide a comprehensive shell script that simulates the entire flow (Public Lead -> Admin Login -> User Creation -> Verification -> Logout):
```bash
# Ensure the server is running (php artisan serve) in another terminal
./docs/tests/auth_full_test.sh
```

## 🏗 Project Structure

- `app/Http/Controllers/Api/V1`: API Controllers.
- `app/Http/Requests/Api/V1`: Form Requests for validation logic.
- `app/Models`: Eloquent models with role-based relationships.
- `app/Http/Middleware`: Security and role-check middleware.
- `routes/api/v1.php`: Versioned API routes.
- `docs/tests`: CURL test scripts.

## 📝 License
This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
