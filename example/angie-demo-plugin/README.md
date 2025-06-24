# Angie Demo - SEO MCP Tools Plugin

This standalone WordPress plugin demonstrates how to create external MCP (Model Context Protocol) tools for the Angie AI assistant.

## Overview

This plugin exposes tools through REST API endpoints that can be consumed by Angie's MCP gateway system. Users can interact with these tools through Angie's chat interface by asking questions like "please improve the SEO of this page".

## Usage in Angie

Once the plugin is active and the MCP server is registered in Angie's gateway, users can:

1. Ask: "Please improve the SEO of this page"
2. Ask: "Create a portfolio post type"
3. Ask: "Let's celebrate"
4. Ask: "Check my site's security"

Each of these examples demonstrates different WordPress tasks:
- **SEO checking and optimization**: Analyze page content, meta tags, and provide actionable SEO improvements
- **WordPress customization**: Create custom post types, fields, and functionality to extend WordPress capabilities
- **Real-time DOM manipulation**: Work directly on the current screen to apply visual changes and modifications to page content
- **Security analysis**: Perform comprehensive security checks including WordPress version, PHP version, debug settings, and provide security recommendations

## How to Run the Demo

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Docker (for wp-env WordPress environment)

### Installation Steps

1. **Clone and navigate to the demo plugin directory:**
   ```bash
   cd example/angie-demo-plugin
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

### WordPress Environment Setup

1. **Start the WordPress environment using wp-env:**
   ```bash
   npm run start
   ```
   This will create a local WordPress instance accessible at `http://localhost:8888`

2. **Access WordPress Admin:**
   - URL: `http://localhost:8888/wp-admin`
   - Username: `admin`
   - Password: `password`

3. **Configure Angie:**
   - Go to Angie → Settings → Allow external scripts
   - Enable the setting to allow external scripts

### Testing the Demo

Once the external scripts are approved, you can test the tools by asking Angie:

- **"Please improve the SEO of this page"** - Analyzes current page SEO
- **"Create a portfolio post type"** - Creates custom WordPress post types  
- **"Let's celebrate"** - Runs a fireworks animation on the screen
- **"Check my site's security"** - Performs security analysis

### Stopping the Environment

To stop the WordPress environment:
```bash
npx wp-env stop
```

## ⚠️ Disclaimer

**This code is for demonstration purposes only.** It is not intended for production use. Please review, test, and modify the code according to your specific requirements and security standards before using it in any live environment.
