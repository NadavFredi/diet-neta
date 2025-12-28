# WhatsApp Interactive Buttons Support

## Overview
Successfully implemented WhatsApp Interactive Buttons (Quick Replies) support for the Template Editor Modal, allowing admins to add up to 3 interactive buttons to any message template.

## Implementation Summary

### 1. Database Schema Update
**File:** `supabase/migrations/20240102000031_add_buttons_to_whatsapp_templates.sql`
- Added `buttons` JSONB column to `whatsapp_flow_templates` table
- Added constraint to ensure maximum 3 buttons per template
- Default value: empty array `[]`

### 2. Redux State Management
**File:** `src/store/slices/automationSlice.ts`
- Added `WhatsAppButton` interface: `{ id: string; text: string }`
- Updated `WhatsAppFlowTemplate` interface to include optional `buttons` array
- Updated `saveTemplate` thunk to accept and save buttons
- Updated `fetchTemplates` to parse buttons from JSONB

### 3. Green API Service Enhancement
**File:** `src/services/greenApiService.ts`
- Updated `SendMessageParams` interface to include optional `buttons` and `footer`
- Enhanced `sendWhatsAppMessage` function:
  - Detects if buttons are provided
  - Uses `SendButtons` endpoint when buttons exist
  - Falls back to standard `sendMessage` for plain text
  - Validates button count (max 3) and text length (max 25 chars)
  - Maps button structure to Green API format: `{ buttonId: "1", buttonText: "text" }`

### 4. Template Editor Modal UI
**File:** `src/components/dashboard/TemplateEditorModal.tsx`
- Added "כפתורים אינטראקטיביים" (Interactive Buttons) section below text editor
- Features:
  - "+" button to add new buttons (disabled when 3 buttons exist)
  - Input field for each button text (max 25 characters, RTL support)
  - Trash icon to remove buttons
  - Numbered display (1., 2., 3.)
  - Helper text explaining placeholder support in button text
  - Empty state message when no buttons
- Updated props to accept `initialButtons` and updated `onSave` signature
- Button state management with validation

### 5. Component Updates
**Files Updated:**
- `src/components/dashboard/LeadAutomationCard.tsx`
  - Updated to pass buttons to template editor
  - Updated to send buttons via Green API
  - Replaces placeholders in button text before sending
- `src/components/dashboard/LeadPaymentCard.tsx`
  - Updated to handle new `onSave` signature (buttons optional)

## Features

### Core Functionality
1. **Add Buttons**: Click "+" to add up to 3 interactive buttons
2. **Edit Button Text**: Input field with 25 character limit (Green API requirement)
3. **Remove Buttons**: Trash icon to delete individual buttons
4. **Placeholder Support**: Buttons support placeholders like `{{name}}`, `{{phone}}`, etc.
5. **Auto-Save**: Buttons saved alongside template content
6. **Smart API Routing**: Automatically uses correct Green API endpoint based on button presence

### UI/UX
- Clean, minimalist design matching DietNeta aesthetic
- Compact button management section
- RTL support for Hebrew text
- Visual feedback (disabled state, character limits)
- Helper text and tooltips

### Validation
- Maximum 3 buttons (WhatsApp policy)
- Maximum 25 characters per button text (Green API limit)
- Button text can include placeholders
- Empty buttons are filtered out before saving

## Green API Integration

### Endpoint Used
- **With Buttons**: `POST /waInstance{idInstance}/SendButtons/{apiTokenInstance}`
- **Without Buttons**: `POST /waInstance{idInstance}/sendMessage/{apiTokenInstance}`

### Request Format (with buttons)
```json
{
  "chatId": "972XXXXXXXXX@c.us",
  "message": "Message text with placeholders replaced",
  "buttons": [
    { "buttonId": "1", "buttonText": "Button 1 Text" },
    { "buttonId": "2", "buttonText": "Button 2 Text" },
    { "buttonId": "3", "buttonText": "Button 3 Text" }
  ],
  "footer": "Optional footer text"
}
```

## Usage Example

1. Open Template Editor Modal (gear icon)
2. Compose message text in rich text editor
3. Scroll to "כפתורים אינטראקטיביים" section
4. Click "הוסף כפתור" to add buttons
5. Enter button text (e.g., "אישור", "ביטול", "{{name}} - אישור")
6. Save template
7. When sending, buttons are automatically included in WhatsApp message

## Technical Notes

### Button ID Generation
- Buttons use unique IDs: `btn-{timestamp}-{random}`
- Green API requires sequential buttonId: "1", "2", "3"
- Mapping happens in `sendWhatsAppMessage` function

### Placeholder Replacement
- Placeholders in button text are replaced before sending
- Uses same `replacePlaceholders` function as message text
- Supports all existing placeholders (name, phone, email, etc.)

### Database Storage
- Buttons stored as JSONB array in PostgreSQL
- Format: `[{"id": "btn-123", "text": "Button Text"}]`
- Automatically parsed when fetching templates

## Migration Required

Run the database migration:
```bash
supabase migration up
```

Or apply manually:
```sql
-- See: supabase/migrations/20240102000031_add_buttons_to_whatsapp_templates.sql
```

## Testing Checklist

- [x] Add button functionality
- [x] Remove button functionality
- [x] Maximum 3 buttons validation
- [x] 25 character limit validation
- [x] Placeholder support in button text
- [x] Save buttons with template
- [x] Load buttons from database
- [x] Send message with buttons via Green API
- [x] Send message without buttons (fallback)
- [x] RTL support
- [x] Error handling

## Future Enhancements

Potential improvements:
- Button reordering (drag & drop)
- Button preview in modal
- Button templates/presets
- Button analytics (click tracking)
- Support for button actions (URLs, phone numbers)
