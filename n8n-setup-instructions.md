# Amazon Purchase Email to Inventory Workflow Setup

## Prerequisites
1. n8n instance (self-hosted or cloud)
2. Gmail account with Amazon purchase emails
3. Google Sheets or database for inventory storage

## Setup Steps

### 1. Import Workflow
- Open n8n
- Go to Workflows > Import
- Upload `amazon-inventory-workflow.json`

### 2. Configure Gmail Node
- Click on "Gmail - Fetch Amazon Emails" node
- Connect your Gmail account via OAuth2
- The workflow searches for emails from Amazon order confirmation addresses

### 3. Configure Storage (Choose One)

#### Option A: Google Sheets
- Enable "Update Google Sheets Inventory" node
- Replace `YOUR_GOOGLE_SHEET_ID` with your actual sheet ID
- Create a sheet named "Inventory" with columns:
  - Order Number
  - Product Name
  - ASIN
  - Quantity Ordered
  - Pack Size
  - Total Items
  - Unit Price
  - Total Cost
  - Purchase Date
  - Amazon URL
  - Last Updated

#### Option B: API Endpoint
- Enable "Update Inventory API" node
- Replace `YOUR_INVENTORY_API_ENDPOINT` with your API URL
- Configure authentication as needed

#### Option C: Database (MongoDB example)
- Enable "Update Database" node
- Configure your database connection
- Adjust collection and field names as needed

### 4. Test and Activate
- Click "Execute Workflow" to test
- Review outputs at each node
- Activate the workflow when ready

## Workflow Features

### Email Parsing
- Extracts order numbers, product names, quantities, and prices
- Identifies Amazon product links and ASINs

### Amazon Scraping
- Fetches product pages to determine pack sizes
- Extracts patterns like "Pack of 12", "24-Count", etc.
- Calculates total items (quantity × pack size)

### Inventory Updates
- Records purchase history
- Tracks total items received
- Maintains purchase dates and prices
- Updates existing records or creates new ones

## Customization Options

### Modify Email Search
Edit the Gmail node search query to filter specific Amazon emails:
- `from:auto-confirm@amazon.com` - Order confirmations
- `from:ship-confirm@amazon.com` - Shipping confirmations
- Add date filters: `after:2024/1/1`

### Enhance Pack Size Detection
Edit "Extract Pack Information" node to add more patterns:
```javascript
const packPatterns = [
  /Box of (\d+)/i,
  /(\d+)[-\s]?units/i,
  // Add more patterns here
];
```

### Add Additional Fields
Modify the code nodes to extract and store:
- Shipping dates
- Tracking numbers
- Product categories
- Vendor information

## Important Notes

1. **Rate Limiting**: Amazon may block excessive requests. Consider:
   - Adding delays between requests
   - Using proxy services
   - Limiting workflow frequency

2. **Email Formats**: Amazon email formats may vary by region. Adjust regex patterns accordingly.

3. **Privacy**: Ensure compliance with data protection regulations when storing purchase data.

4. **Testing**: Always test with a small batch of emails first.

## Troubleshooting

- **No emails found**: Check Gmail search query and authentication
- **Pack size not detected**: Review Amazon page HTML structure, may need pattern updates
- **Storage fails**: Verify credentials and permissions for Google Sheets/database
- **Workflow errors**: Check n8n logs and individual node outputs