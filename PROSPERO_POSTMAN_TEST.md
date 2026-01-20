# Testing Prospero Integration with Postman

## Step-by-Step Guide

### Step 1: Get Webhook URL from Make
1. Open your Make scenario: "Integration Webhooks, Prospero"
2. Click on the first module: **"Webhooks (1) - Custom webhook"**
3. Copy the webhook URL (it should be: `https://hook.us1.make.com/12buvi4g3epo9z3f2li17thbhqt924jl`)

### Step 2: Set Up Postman Request

#### Request Configuration:
- **Method**: `POST`
- **URL**: `https://hook.us1.make.com/12buvi4g3epo9z3f2li17thbhqt924jl`

#### Headers:
```
Content-Type: application/json
```

#### Body (raw JSON):
```json
{
  "leadId": "test-lead-id-123",
  "phone": "0501234567",
  "email": "test@example.com"
}
```

### Step 3: Test the Request

1. **In Postman:**
   - Click "Send" button
   - Check the response status (should be `200 OK`)
   - Check the response body

2. **Expected Response:**
```json
{
  "link": "https://app.goprospero.com/d/0beee34f-bf59-4d5a-843b-4e6967682514"
}
```

3. **In Make:**
   - Click "Run once" button to see the scenario execution
   - Check the execution logs to verify:
     - Webhook received the data
     - Prospero created the proposal
     - Response was sent back

### Step 4: Verify the Response

The response should contain:
- `link`: A URL to the Prospero proposal (should start with `https://app.goprospero.com/`)

### Troubleshooting

**If you get an error:**
1. Check that the webhook URL is correct
2. Verify the JSON payload format is correct
3. Check Make scenario execution logs
4. Ensure the Prospero module is properly configured in Make

**Common Issues:**
- **400 Bad Request**: Check JSON format
- **404 Not Found**: Verify webhook URL
- **500 Internal Server Error**: Check Make scenario logs
- **Missing link in response**: Check Prospero module configuration in Make

### Test Data Examples

**Minimal payload (without email):**
```json
{
  "leadId": "test-lead-id-123",
  "phone": "0501234567",
  "email": ""
}
```

**Full payload:**
```json
{
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "0501234567",
  "email": "customer@example.com"
}
```
