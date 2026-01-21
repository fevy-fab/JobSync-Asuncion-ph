# End-to-End Testing Guide: Email Change Functionality (E4)

## Overview

This guide provides comprehensive step-by-step instructions for testing the email change verification functionality implemented in E4. The system now requires users to verify both their current and new email addresses before the email change takes effect.

## Prerequisites

1. **Development Server Running**: Ensure the app is running at `http://localhost:3000`
2. **Email Access**: You need access to two different email addresses:
   - Current email (registered in the system)
   - New email (where you want to change to)
3. **Test Accounts**: Have at least one test account for each role:
   - Applicant
   - HR
   - PESO
   - Admin

## Test Setup

### Creating Test Accounts (if needed)

If you don't have test accounts yet:

1. Navigate to registration page
2. Register accounts with accessible email addresses
3. Note down the credentials for testing

### Recommended Test Email Services

For testing, consider using:
- Gmail with `+` aliases (e.g., `yourname+test1@gmail.com`, `yourname+test2@gmail.com`)
- Temporary email services (for quick testing)
- Development email testing tools (Mailhog, Mailtrap)

## Test Scenarios

### Scenario 1: Successful Email Change (Happy Path)

**Test Account**: Any role (Applicant, HR, PESO, or Admin)

#### Step 1: Navigate to Settings Page

Based on your test account role, go to:
- **Applicant**: `http://localhost:3000/applicant/settings`
- **HR**: `http://localhost:3000/hr/settings`
- **PESO**: `http://localhost:3000/peso/settings`
- **Admin**: `http://localhost:3000/admin/settings`

#### Step 2: View Current Profile

**Expected State**:
- Profile Picture card on the left
- Profile Information card on the right
- Current email displayed in disabled input field
- No orange verification banner visible
- Fields are in read-only mode

**Screenshot Checkpoint**: Document the initial state

#### Step 3: Initiate Email Change

1. Click the **"Edit"** button at the bottom right of Profile Information card
2. Fields become editable
3. Change the email address to a new, valid email
4. Click **"Save Changes"** button

**Expected Behavior**:
- Loading state appears on button ("Saving...")
- After 1-2 seconds, toast notification appears:
  - Message: "Profile updated. Email verification required: Check both your current and new email addresses for confirmation links."
  - Type: Success (green)
- Page does NOT reload
- Email field reverts to showing original email (not the new one)
- Edit mode exits automatically

#### Step 4: Verify Orange Banner Appears

**Expected State After Save**:
- Orange verification banner appears at the top of Profile Information card
- Banner shows:
  - Title: "Email Verification Pending"
  - Current email: `[your-current-email@example.com]`
  - New email (pending): `[your-new-email@example.com]`
  - Instructions list with 3 steps
  - "Resend Verification Emails" button (optional, for retrying)

**Screenshot Checkpoint**: Document the verification banner

#### Step 5: Check Current Email Inbox

1. Open your **current email** inbox
2. Look for email from Supabase with subject like "Confirm email change"

**Expected Email**:
- **From**: Supabase (or your configured sender)
- **Subject**: Confirm email change / Confirm Change of Email Address
- **Content**: Message asking you to confirm the email change
- **CTA**: "Confirm email change" button/link

**Important**: Keep this tab/window open

#### Step 6: Check New Email Inbox

1. Open your **new email** inbox (the one you're changing to)
2. Look for email from Supabase

**Expected Email**:
- **From**: Supabase (or your configured sender)
- **Subject**: Confirm email change / Confirm Change of Email Address
- **Content**: Message asking you to confirm the new email address
- **CTA**: "Confirm email change" button/link

**Important**: Keep this tab/window open

#### Step 7: Confirm Current Email

1. Go back to **current email** inbox
2. Click the "Confirm email change" link/button
3. Browser opens a new tab

**Expected Behavior**:
- Redirects to: `http://localhost:3000/api/auth/callback?token_hash=...&type=email_change`
- Then immediately redirects to: `http://localhost:3000/account/settings?email_verified=true`
- Toast notification may appear (optional): "Email change confirmed for current address"
- Orange banner is **STILL VISIBLE** (because both emails must be confirmed)
- Email field still shows **old email**

**Screenshot Checkpoint**: Document state after confirming current email

#### Step 8: Confirm New Email

1. Go to **new email** inbox
2. Click the "Confirm email change" link/button
3. Browser opens a new tab

**Expected Behavior**:
- Redirects to: `http://localhost:3000/api/auth/callback?token_hash=...&type=email_change`
- Then redirects to: `http://localhost:3000/account/settings?email_verified=true`
- Toast notification: "Email changed successfully" (or similar)
- Orange banner **DISAPPEARS**
- Email field now shows **new email**
- Profile has been updated

**Screenshot Checkpoint**: Document final state after both confirmations

#### Step 9: Verify Database Sync

1. Check Supabase Dashboard
2. Navigate to Table Editor → `profiles` table
3. Find your test user record
4. Verify `email` column shows the **new email**
5. Navigate to Authentication → Users
6. Find your test user
7. Verify `email` column shows the **new email**

**Expected State**:
- `auth.users.email` = new email ✅
- `profiles.email` = new email ✅
- Both tables are in sync

#### Step 10: Test Login with New Email

1. Log out from the application
2. Go to login page
3. Try logging in with **new email** and password

**Expected Behavior**:
- Login succeeds ✅
- Dashboard loads correctly

---

### Scenario 2: Email Change with Partial Confirmation

**Purpose**: Test what happens if user only confirms one email

#### Setup

1. Follow Steps 1-6 from Scenario 1
2. You should now have verification emails in both inboxes

#### Test Path A: Confirm Only Current Email

1. Click verification link in **current email** only
2. Do NOT click link in new email
3. Wait 5 minutes
4. Navigate to settings page

**Expected Behavior**:
- Orange banner is **STILL VISIBLE**
- Email field shows **old email** (not changed)
- User can click "Resend Verification Emails" to retry
- Data remains unchanged in database

#### Test Path B: Confirm Only New Email

1. Click verification link in **new email** only
2. Do NOT click link in current email
3. Navigate to settings page

**Expected Behavior**:
- Orange banner is **STILL VISIBLE**
- Email field shows **old email** (not changed)
- Both confirmations required for change to take effect

---

### Scenario 3: Resend Verification Emails

**Purpose**: Test the resend functionality when user doesn't receive emails

#### Steps

1. Follow Steps 1-4 from Scenario 1 to initiate email change
2. Orange banner should appear
3. Click **"Resend Verification Emails"** button

**Expected Behavior**:
- Button shows loading state ("Resending...")
- After 1-2 seconds, toast appears: "Verification emails resent successfully"
- New verification emails sent to both addresses
- Check both inboxes - new emails should arrive
- Click links in the new emails (old links may still work but test with new ones)

---

### Scenario 4: Email Already in Use

**Purpose**: Test validation when trying to change to an email already registered

#### Steps

1. Navigate to settings page
2. Click "Edit" button
3. Change email to an address **already used by another account**
4. Click "Save Changes"

**Expected Behavior**:
- Error toast appears: "Email already in use by another account"
- No verification emails sent
- Email change NOT initiated
- Email field shows original email
- No orange banner appears

---

### Scenario 5: Invalid Email Format

**Purpose**: Test client-side validation

#### Steps

1. Navigate to settings page
2. Click "Edit" button
3. Enter invalid email (e.g., "notanemail", "test@", "test.com")
4. Try to click "Save Changes"

**Expected Behavior**:
- Browser's built-in HTML5 validation catches it (since input has `type="email"`)
- Shows browser's default error: "Please enter a valid email address"
- Form submission prevented
- OR if it gets past HTML5 validation, API returns error

---

### Scenario 6: Testing All Four Roles

**Purpose**: Ensure email change works consistently across all user roles

Repeat **Scenario 1 (Happy Path)** for each role:

#### Applicant Role
- URL: `http://localhost:3000/applicant/settings`
- Expected: Same behavior as described in Scenario 1

#### HR Role
- URL: `http://localhost:3000/hr/settings`
- Expected: Same behavior as described in Scenario 1

#### PESO Role
- URL: `http://localhost:3000/peso/settings`
- Expected: Same behavior as described in Scenario 1

#### Admin Role
- URL: `http://localhost:3000/admin/settings`
- Expected: Same behavior as described in Scenario 1

**Verification Checklist** (for each role):
- [ ] Email change initiated successfully
- [ ] Orange banner appears with correct emails
- [ ] Verification emails sent to both addresses
- [ ] Current email confirmation works
- [ ] New email confirmation works
- [ ] Email updates after both confirmations
- [ ] Orange banner disappears
- [ ] Database synced correctly

---

### Scenario 7: Cancel Edit Without Saving

**Purpose**: Test that canceling doesn't trigger email change

#### Steps

1. Navigate to settings page
2. Click "Edit" button
3. Change email to something new
4. Click **"Cancel"** button (not "Save Changes")

**Expected Behavior**:
- Fields revert to original values
- No API call made
- No verification emails sent
- Edit mode exits
- No changes persisted

---

### Scenario 8: Activity Log Verification

**Purpose**: Verify that email changes are logged in activity logs

#### Steps

1. Complete a successful email change (Scenario 1)
2. Log in as Admin
3. Navigate to Activity Logs page
4. Filter or search for recent activities

**Expected Entry**:
- **User**: Your test account
- **Event Type**: `email_changed`
- **Category**: `user_management`
- **Details**: "User changed their email address to [new-email]"
- **Metadata**: Should include `newEmail` and `verifiedAt` timestamp
- **Timestamp**: Should match when you confirmed both emails

---

## Edge Cases to Test

### Edge Case 1: Expired Verification Links

**Setup**: Supabase tokens typically expire after a certain period (check your Supabase project settings)

**Test**:
1. Initiate email change
2. Wait for token expiration period (e.g., 24 hours)
3. Try clicking verification links

**Expected**: Error message about expired token, need to resend verification

### Edge Case 2: Multiple Email Changes in Quick Succession

**Test**:
1. Initiate email change from A → B
2. Before confirming, initiate another change from A → C
3. Check behavior

**Expected**: Second change should override the first (Supabase behavior)

### Edge Case 3: Clicking Verification Link Multiple Times

**Test**:
1. Initiate email change
2. Confirm current email
3. Click the same current email verification link again

**Expected**: Should handle gracefully (either succeed silently or show "already verified")

---

## Database Verification Queries

### Check Pending Email Change Status

Use Supabase SQL Editor:

```sql
-- Check auth.users table for pending email change
SELECT
  id,
  email,
  email_change,
  email_change_confirm_status,
  email_change_sent_at,
  updated_at
FROM auth.users
WHERE email = 'your-test-email@example.com';
```

**Status Values**:
- `0` = No confirmation yet
- `1` = One email confirmed (either current or new)
- `2` = Both emails confirmed (change complete)

### Verify Profile Sync

```sql
-- Check if profiles.email matches auth.users.email
SELECT
  p.id,
  p.email as profile_email,
  au.email as auth_email,
  CASE
    WHEN p.email = au.email THEN 'SYNCED ✅'
    ELSE 'OUT OF SYNC ❌'
  END as sync_status
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.email = 'your-test-email@example.com'
   OR au.email = 'your-test-email@example.com';
```

### Check Activity Logs

```sql
-- Find email change activities
SELECT
  id,
  user_id,
  event_type,
  event_category,
  details,
  metadata,
  created_at
FROM activity_logs
WHERE event_type = 'email_changed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Common Issues and Troubleshooting

### Issue 1: Verification Emails Not Received

**Possible Causes**:
- Email in spam folder
- Supabase email configuration issues
- Email service rate limiting

**Debug Steps**:
1. Check Supabase Dashboard → Logs → Edge Logs
2. Look for email sending errors
3. Check spam/junk folders
4. Verify Supabase email settings in project settings
5. Try with different email providers (Gmail, Outlook, etc.)

### Issue 2: Orange Banner Doesn't Appear

**Debug Steps**:
1. Open browser DevTools → Console
2. Look for JavaScript errors
3. Check Network tab for failed API calls
4. Verify `pendingEmail` state is being set correctly
5. Check that `auth.users.email_change` column has the new email

### Issue 3: Email Not Updating After Both Confirmations

**Debug Steps**:
1. Check `/api/auth/callback` logs (add console.logs if needed)
2. Verify both confirmation links were clicked
3. Check `auth.users.email_change_confirm_status` value
4. Run database verification queries above
5. Check for errors in activity logs

### Issue 4: Error on Profile Update

**Debug Steps**:
1. Check browser Network tab for API response
2. Look at `/api/profile` endpoint logs
3. Verify validation schema allows the email format
4. Check for duplicate email in database

---

## Success Criteria Checklist

### Functional Requirements
- [ ] Email change requires verification from both current and new email
- [ ] User sees clear instructions via orange banner
- [ ] `profiles.email` does NOT update until both emails confirmed
- [ ] `auth.users.email` updates only after both confirmations
- [ ] Database tables remain in sync
- [ ] Works consistently across all 4 user roles
- [ ] Activity log entry created on successful change

### UI/UX Requirements
- [ ] Orange banner displays correct current and new email addresses
- [ ] Banner shows clear 3-step instructions
- [ ] Resend button works correctly
- [ ] Banner disappears after successful verification
- [ ] Toast notifications are clear and descriptive
- [ ] Edit/Cancel buttons work as expected
- [ ] No data loss when canceling edit

### Security Requirements
- [ ] Cannot change to email already in use
- [ ] Both emails must be confirmed (not just one)
- [ ] Verification tokens expire appropriately
- [ ] Old email field shows current email during pending state
- [ ] No unauthorized email changes possible

### Technical Requirements
- [ ] No console errors during flow
- [ ] API responses are appropriate
- [ ] Database queries are efficient
- [ ] RLS policies allow necessary operations
- [ ] Activity logs record changes correctly

---

## Testing Completion Report Template

After completing all tests, use this template to document results:

```markdown
# E4 Email Change Functionality - Test Results

**Tested By**: [Your Name]
**Date**: [Date]
**Environment**: Development (localhost:3000)

## Test Results Summary

| Scenario | Status | Notes |
|----------|--------|-------|
| Scenario 1: Happy Path | ✅ PASS / ❌ FAIL | |
| Scenario 2: Partial Confirmation | ✅ PASS / ❌ FAIL | |
| Scenario 3: Resend Emails | ✅ PASS / ❌ FAIL | |
| Scenario 4: Duplicate Email | ✅ PASS / ❌ FAIL | |
| Scenario 5: Invalid Email | ✅ PASS / ❌ FAIL | |
| Scenario 6: All Roles | ✅ PASS / ❌ FAIL | |
| Scenario 7: Cancel Edit | ✅ PASS / ❌ FAIL | |
| Scenario 8: Activity Logs | ✅ PASS / ❌ FAIL | |

## Issues Found

1. [Issue description]
   - **Severity**: High / Medium / Low
   - **Steps to Reproduce**:
   - **Expected**:
   - **Actual**:
   - **Screenshot**:

## Additional Notes

[Any other observations or recommendations]

## Final Verdict

- [ ] APPROVED - Ready for production
- [ ] APPROVED WITH MINOR ISSUES - Document and fix before deployment
- [ ] REJECTED - Major issues found, requires fixes
```

---

## Quick Test Checklist (For Rapid Verification)

If you need to quickly verify the implementation works:

1. [ ] Go to any settings page (e.g., `/applicant/settings`)
2. [ ] Click "Edit" → Change email → "Save Changes"
3. [ ] Orange banner appears with both emails shown
4. [ ] Check both email inboxes for verification emails
5. [ ] Click verification link in current email → Banner still visible
6. [ ] Click verification link in new email → Banner disappears, email updated
7. [ ] Check Supabase: `profiles.email` = new email ✅
8. [ ] Log out and log back in with new email → Works ✅

**Time Required**: ~5 minutes per role (if emails arrive quickly)

---

## Notes for Production Testing

When testing in production or staging:

1. **Use Real Email Addresses**: Temporary emails may not work with production email services
2. **Check Email Deliverability**: Verify Supabase email settings are configured for production domain
3. **Test Email Templates**: Confirm email templates are branded correctly
4. **Monitor Logs**: Watch for any email sending failures
5. **Rate Limiting**: Be aware of email service rate limits
6. **User Communication**: Consider adding help text or FAQ about email change process

---

## Contact & Support

If you encounter issues during testing:

1. Check browser console for errors
2. Review Supabase logs (Dashboard → Logs)
3. Verify database state with SQL queries provided
4. Document the issue with screenshots and steps to reproduce

---

**Testing Guide Version**: 1.0
**Last Updated**: 2025-12-27
**Related Feature**: E4 - Email Change Functionality
**Implementation Files**:
- `/api/profile/route.ts` (Lines 87-169)
- `/api/auth/callback/route.ts` (New file)
- `/components/account/EmailVerificationStatus.tsx` (New component)
- All 4 settings pages updated (Applicant, HR, PESO, Admin)
