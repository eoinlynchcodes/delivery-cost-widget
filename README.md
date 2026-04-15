# Delivery Cost Widget

Embeddable delivery cost calculator for Shopify stores. Customers enter a town, village, or Eircode and get an instant delivery estimate based on distance from the yard in Mullingar, Co. Westmeath.

## How it works

1. Customer enters a location (town name or Eircode)
2. The widget calls `POST /api/widget-calculate` on the Vercel API
3. The API geocodes the location using Google Maps, calculates the distance from origin (N91PT7W), and returns delivery fees for two order value tiers
4. The widget displays the estimated fees or a courier message if the location is outside the delivery radius

### API Endpoint

```
POST https://delivery-cost-calc-by-eoin-lynch.vercel.app/api/widget-calculate
Content-Type: application/json

{ "location": "Athlone" }
```

**Success response** (within delivery radius):
```json
{
  "deliverable": true,
  "distance_km": 32,
  "fee_standard": 55.00,
  "fee_large": 26.00
}
```

**Out of range response** (> 40km):
```json
{
  "deliverable": false,
  "distance_km": 95,
  "message": "We don't deliver to this location directly, but we can arrange a courier. Please get in touch for a quote."
}
```

## Files

| File | Purpose |
|------|---------|
| `widget.js` | Self-contained vanilla JS widget (no dependencies, no build step) |
| `sections/delivery-calculator.liquid` | Shopify theme section file |
| `templates/page.delivery-calculator.json` | Shopify page template |

## Adding to Shopify

### Step 1: Upload the section file

1. In your Shopify admin, go to **Online Store > Themes**
2. Click **Actions > Edit code** on your active theme
3. Under **Sections**, click **Add a new section**
4. Name it `delivery-calculator` and replace its contents with the code from `sections/delivery-calculator.liquid`
5. Click **Save**

### Step 2: Add the section to the homepage (or any page)

1. Go to **Online Store > Themes > Customize**
2. Navigate to the page where you want the widget
3. Click **Add section** and search for **Delivery Calculator**
4. Adjust the heading, description, and padding in the section settings
5. Click **Save**

### Step 3: Create a standalone delivery calculator page

1. Upload the page template:
   - In **Edit code**, under **Templates**, click **Add a new template**
   - Choose type **page**, name it `delivery-calculator`
   - Replace its contents with the code from `templates/page.delivery-calculator.json`
   - Click **Save**
2. Create the page:
   - Go to **Online Store > Pages > Add page**
   - Set the title to "Delivery Calculator" (or whatever you like)
   - In the **Theme template** dropdown (bottom right), select `page.delivery-calculator`
   - Click **Save**
3. The page is now live at `yourstore.com/pages/delivery-calculator`

### Alternative: Paste directly into a page

If you just want a quick embed without creating theme files, add this to any page's HTML:

```html
<div id="delivery-cost-widget"></div>
<script src="https://cdn.jsdelivr.net/gh/eoinlynchcodes/delivery-cost-widget@latest/widget.js" defer></script>
```

## Environment Variables

The widget itself requires no environment variables. The Vercel API (`delivery-cost` repo) requires:

| Variable | Where | Purpose |
|----------|-------|---------|
| `GOOGLE_MAPS_API_KEY` | Vercel project settings | Google Maps Distance Matrix API |

Pricing configuration (base fees, per-km rates, price bands) is managed through the admin UI at the Vercel app and stored in Vercel KV via the `delivery-cost-api`.
