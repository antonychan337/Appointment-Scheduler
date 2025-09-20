# Appointment Scheduler

A bilingual (English/Chinese) appointment scheduling system for barber shops and salons.

## Project Structure

### Core Files
- `owner-app.html` - Owner dashboard for managing appointments, services, and barbers
- `customer-app.html` - Customer-facing booking interface
- `shared-data.js` - Shared data management and localStorage operations
- `emailjs-admin-config.html` - Admin tool for configuring EmailJS settings

### Directories
- `backend/` - Backend API (Node.js/TypeScript) - for future production deployment
- `HaircutBooking/` - React Native mobile app version

### Documentation
- `Claude.md` - Development instructions and guidelines
- `CHECKPOINT_GITHUB_PUSH.md` - Project milestones and checkpoint documentation

## Features

- **Multi-language Support**: Full English and Chinese translations
- **Multi-barber Support**: Handles single or multiple barbers/stylists
- **Service Management**: Customizable services with duration and pricing
- **Email Notifications**: Automated booking confirmations and cancellations via EmailJS
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Availability**: Dynamic time slot management with conflict detection

## Usage

1. Open `owner-app.html` in a web browser for the owner interface
2. Access customer booking through the owner app or directly via `customer-app.html`
3. Configure email settings using `emailjs-admin-config.html` (password: admin123)

## Development

This is currently a client-side demo using localStorage. The `backend/` folder contains the foundation for a production API implementation.