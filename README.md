# Photography Tools - Order Management App

A simple HTML application for managing photography shop orders.

## Features

- Customer order registration
- Product management
- Deposit and remaining amount tracking
- Customer search by phone number
- Automatic data persistence to local files
- Excel-friendly CSV export of orders with per-size counts

## Setup

### Quick Start

**Option 1: Double-click `start-server.bat`** (Easiest)

**Option 2: Run in Terminal**

If you get PowerShell execution policy error, use one of these:

```bash
# Method 1: Use Command Prompt (cmd) instead of PowerShell
node server.js

# Method 2: Bypass PowerShell policy (one-time)
powershell -ExecutionPolicy Bypass -Command "npm start"

# Method 3: Change PowerShell policy (requires admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then open browser: `http://localhost:3000`

### Option 3: Direct File Access (Fallback)

If server is not running, the app will use browser localStorage as fallback.

## Data Storage

Data is automatically saved to:
- `data/products.json` - Product database
- `data/orders.json` - Orders database

These files are created automatically in the project directory.

## Usage

1. **Manage Products**: Go to "Manage Products" page to add/edit products
2. **Create Order**: Enter customer name and phone, add products to cart, set deposit, finalize order
3. **Find Customer**: Search by phone number to view previous orders
4. **Settle Payment**: Click "Settle" button on orders with remaining balance

## Backup

Simply copy the `data` folder to backup your data. The files are standard JSON format.
