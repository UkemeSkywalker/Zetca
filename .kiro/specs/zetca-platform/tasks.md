# Implementation Plan: Zetca AI Social Media Automation Platform

## Overview

This implementation plan breaks down the Zetca platform into discrete, incremental coding tasks with immediate visual feedback. Each task produces visible UI changes that can be viewed in the browser. The implementation follows a "build and see" approach where we create components and immediately integrate them into pages for visual verification.

## Tasks

- [x] 1. Project Setup and Foundation
  - Initialize Next.js 16 project with TypeScript and App Router
  - Configure Tailwind CSS with custom theme colors and spacing
  - Set up folder structure (/app, /components, /types, /data, /hooks, /context, /lib)
  - Install dependencies: @iconify/react, fast-check, jest, @testing-library/react
  - Create tsconfig.json with strict mode enabled
  - Create basic app/layout.tsx with HTML structure and globals.css import
  - Create app/page.tsx with "Hello Zetca" heading to verify setup
  - Run dev server and verify page loads at http://localhost:3000
  - _Requirements: 20.1, 20.5, 18.4_

- [x] 2. Global Styles and Basic UI Components
  - [x] 2.1 Create app/globals.css with Tailwind imports and custom styles
    - Import Tailwind directives (@tailwind base, components, utilities)
    - Add custom theme colors (primary blue, secondary gray, success green, error red)
    - Add custom animations for loading and transitions
    - Verify styles load in browser
    - _Requirements: 13.4_
  
  - [x] 2.2 Create Button component with all variants
    - Implement variant props (primary, secondary, outline, ghost)
    - Implement size props (sm, md, lg)
    - Add loading state with spinner
    - Create demo page at app/demo/page.tsx showing all button variants
    - Verify buttons render correctly in browser
    - _Requirements: 12.2_
  
  - [x] 2.3 Create Input component
    - Implement label, error, helperText props
    - Add error state styling with red border
    - Create demo showing inputs with labels, errors, and helper text
    - Add to demo page and verify in browser
    - _Requirements: 12.4_
  
  - [x] 2.4 Create Card component
    - Implement title, description, children, actions props
    - Add variant props (default, bordered, elevated)
    - Add to demo page with different variants
    - Verify cards render with proper spacing and shadows
    - _Requirements: 12.3_

- [x] 3. TypeScript Interfaces and Mock Data
  - [x] 3.1 Create TypeScript interfaces in /types directory
    - Define Strategy, Caption, Post, Analytics, UserProfile, ConnectedAccount, GeneratedImage interfaces
    - Export all interfaces from types/index.ts
    - _Requirements: 18.1, 18.6_
  
  - [x] 3.2 Create mock data JSON files in /data directory
    - Create mockStrategies.json with 3 sample strategies
    - Create mockCaptions.json with 10 sample captions for different platforms
    - Create mockPosts.json with 15 sample scheduled posts
    - Create mockImages.json with 6 placeholder image URLs
    - Create mockAnalytics.json with metrics, engagement data, platform performance
    - _Requirements: 16.1, 16.2_

- [x] 4. Navigation Bar (Visible Immediately)
  - [x] 4.1 Create Navbar component
    - Implement navigation links (Home, Login, Signup, Dashboard)
    - Add logo text "Zetca" on the left
    - Style with white background, shadow, and sticky positioning
    - Make responsive with hamburger menu for mobile
    - _Requirements: 1.8_
  
  - [x] 4.2 Add Navbar to root layout
    - Update app/layout.tsx to include Navbar above children
    - Verify navbar appears on all pages
    - Test navigation links work
    - Test responsive behavior by resizing browser
    - _Requirements: 1.8_

- [x] 5. Home Page - Hero Section (First Visible Content)
  - [x] 5.1 Create HeroSection component
    - Add Herobg.jpg to public/images folder
    - Use Next.js Image for background
    - Add headline: "AI-Powered Social Media Automation"
    - Add subheadline and CTA button linking to /dashboard
    - Style with centered content and large text
    - _Requirements: 1.2_
  
  - [x] 5.2 Update app/page.tsx to show HeroSection
    - Replace "Hello Zetca" with HeroSection component
    - Verify hero displays with background image
    - Test CTA button navigation
    - _Requirements: 1.1_

- [x] 6. Home Page - Features Section
  - [x] 6.1 Install and configure Iconify
    - Install @iconify/react package
    - Create SolarIcon wrapper component in components/icons
    - Test icon rendering on demo page
    - _Requirements: 19.1_
  
  - [x] 6.2 Create FeaturesSection component
    - Create grid layout (3 columns desktop, 2 tablet, 1 mobile)
    - Add 6 feature cards with Solar icons, titles, descriptions
    - Features: AI Strategy, Smart Copywriting, Easy Scheduling, Image Generation, One-Click Publishing, Analytics
    - Add hover effects (shadow-lg transition)
    - _Requirements: 1.3_
  
  - [x] 6.3 Add FeaturesSection to home page
    - Add below HeroSection in app/page.tsx
    - Verify grid layout and responsive behavior
    - Test hover effects on cards
    - _Requirements: 1.1_

- [x] 7. Home Page - Waitlist Section
  - [x] 7.1 Create WaitlistSection component
    - Add section heading "Join the Waitlist"
    - Add email Input component
    - Add "Join Now" Button component
    - Implement email validation (regex pattern)
    - Add success/error message display
    - Implement 2-second delay simulation on submit
    - Clear input on success
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 7.2 Add WaitlistSection to home page
    - Add below FeaturesSection in app/page.tsx
    - Test email validation with valid/invalid emails
    - Verify success message appears after delay
    - Verify input clears on success
    - _Requirements: 1.1_

- [x] 8. Home Page - Pricing Section
  - [x] 8.1 Create PricingSection component
    - Create grid with 3 pricing cards (Free, Pro, Enterprise)
    - Add pricing details, features lists with checkmarks
    - Highlight "Pro" tier with blue border and "Popular" badge
    - Add CTA buttons (UI only)
    - _Requirements: 1.5_
  
  - [x] 8.2 Add PricingSection to home page
    - Add below WaitlistSection in app/page.tsx
    - Verify 3-column grid on desktop
    - Verify Pro tier is highlighted
    - _Requirements: 1.1_

- [x] 9. Home Page - Footer
  - [x] 9.1 Create Footer component
    - Create 4-column grid (Product, Company, Resources, Legal)
    - Add social media icons (Instagram, Twitter, LinkedIn, Facebook)
    - Add copyright text
    - Make responsive (2 columns tablet, 1 column mobile)
    - _Requirements: 1.6, 1.7_
  
  - [x] 9.2 Add Footer to root layout
    - Update app/layout.tsx to include Footer below children
    - Verify footer appears on all pages
    - Test responsive grid layout
    - _Requirements: 1.7_

- [x] 10. Checkpoint - Home Page Complete
  - Verify complete home page with all sections
  - Test responsive behavior at all breakpoints
  - Test all interactive elements (buttons, form, links)
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Login Page (Visible Auth UI)
  - [ ] 11.1 Create LoginForm component
    - Add email and password Input components
    - Add "Login" Button component
    - Implement email validation (regex)
    - Implement password length validation (min 8 chars)
    - Add "Forgot password?" link (UI only)
    - Add "Don't have an account? Sign up" link to /signup
    - Implement submit with 1-second delay and redirect to /dashboard
    - _Requirements: 21.1, 21.4, 21.6_
  
  - [ ] 11.2 Create app/login/page.tsx
    - Center LoginForm on page with max-width
    - Add page heading "Welcome Back"
    - Verify Navbar appears at top
    - Verify Footer appears at bottom
    - _Requirements: 21.1, 21.3_
  
  - [ ] 11.3 Test login page
    - Navigate to /login and verify form displays
    - Test email validation with invalid emails
    - Test password validation with short passwords
    - Test successful login redirects to /dashboard
    - _Requirements: 21.4_

- [ ] 12. Signup Page
  - [ ] 12.1 Create SignupForm component
    - Add name, email, password, confirm password Input components
    - Add terms of service checkbox
    - Add "Sign Up" Button component
    - Implement all validations (name length, email format, password length, password match)
    - Add "Already have an account? Log in" link to /login
    - Implement submit with 1-second delay and redirect to /dashboard
    - _Requirements: 21.2, 21.5, 21.6_
  
  - [ ] 12.2 Create app/signup/page.tsx
    - Center SignupForm on page with max-width
    - Add page heading "Create Your Account"
    - Verify Navbar and Footer appear
    - _Requirements: 21.2, 21.3_
  
  - [ ] 12.3 Test signup page
    - Navigate to /signup and verify form displays
    - Test all validations
    - Test password confirmation mismatch
    - Test successful signup redirects to /dashboard
    - _Requirements: 21.5_

- [ ] 13. Dashboard Layout and Sidebar (First Dashboard View)
  - [ ] 13.1 Create Sidebar component
    - Add navigation items with Solar icons: Strategist, Copywriter, Scheduler, Designer, Publisher, Analysis, Profile
    - Implement active route highlighting using usePathname
    - Style with dark background (bg-gray-900) and white text
    - Make fixed on desktop, overlay on mobile
    - _Requirements: 3.2, 3.4_
  
  - [ ] 13.2 Create app/dashboard/layout.tsx
    - Implement layout with Sidebar on left and main content area on right
    - Add responsive behavior (sidebar collapses on mobile)
    - _Requirements: 3.1_
  
  - [ ] 13.3 Create app/dashboard/page.tsx
    - Add welcome message "Welcome to Zetca Dashboard"
    - Add cards showing quick stats (mock data)
    - Add "Get Started" button linking to /dashboard/strategist
    - _Requirements: 1.9_
  
  - [ ] 13.4 Test dashboard layout
    - Navigate to /dashboard and verify layout displays
    - Verify sidebar shows all navigation items
    - Test sidebar navigation to different pages
    - Test responsive sidebar on mobile
    - _Requirements: 3.1, 3.5_

- [ ] 14. Agent Workflow Visualization
  - [ ] 14.1 Create StatusBadge component
    - Implement status prop with color mapping
    - Scheduled: yellow, Published: green, Draft: gray, Complete: green, In Progress: blue, Not Started: gray
    - Apply rounded-full styling
    - _Requirements: 12.6_
  
  - [ ] 14.2 Create AgentContext for shared state
    - Define context with strategy, captions, workflowStatus
    - Implement provider with useState hooks
    - Add methods to update workflow status
    - Wrap dashboard layout with provider
    - _Requirements: 4.4, 5.1_
  
  - [ ] 14.3 Create AgentWorkflow component
    - Display horizontal workflow: Strategist → Copywriter → Scheduler → Designer → Publisher
    - Add icons and labels for each agent
    - Add StatusBadge for each agent
    - Add connecting arrows between agents
    - Highlight current agent based on route
    - Make responsive (vertical on mobile)
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  
  - [ ] 14.4 Create PageWrapper component
    - Accept showWorkflow prop
    - Conditionally render AgentWorkflow at top
    - Add responsive padding
    - _Requirements: 12.1_
  
  - [ ] 14.5 Test workflow visualization
    - Navigate to /dashboard/strategist
    - Verify workflow displays at top
    - Verify Strategist is highlighted
    - Navigate to other agent pages and verify highlighting updates
    - Navigate to /dashboard/analysis and verify workflow is hidden
    - _Requirements: 11.1, 11.6_

- [ ] 15. Strategist Page (First Agent Tool)
  - [ ] 15.1 Create StrategyForm component
    - Add Input components for: brandName, industry, targetAudience, goals
    - Add "Generate Strategy" Button with loading state
    - Implement required field validation
    - Fetch mock strategy from mockStrategies.json with 2-second delay
    - Display generated strategy in formatted Card components
    - Save strategy to AgentContext
    - Update workflow status to mark Strategist as complete
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 15.2 Create app/dashboard/strategist/page.tsx
    - Wrap StrategyForm with PageWrapper (showWorkflow=true)
    - Add page heading "AI Strategy Generator"
    - _Requirements: 4.1_
  
  - [ ] 15.3 Test strategist page
    - Navigate to /dashboard/strategist
    - Verify workflow shows at top
    - Fill form and click generate
    - Verify loading state appears
    - Verify strategy displays after 2 seconds
    - Verify workflow status updates to "Complete"
    - _Requirements: 4.2, 4.5_

- [ ] 16. Checkpoint - Dashboard Foundation Complete
  - Verify dashboard layout with sidebar
  - Verify agent workflow visualization
  - Verify strategist page generates and displays strategy
  - Test navigation between dashboard pages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Copywriter Page
  - [ ] 17.1 Create CaptionEditor component
    - Fetch captions from AgentContext (or show "No strategy found" message)
    - Display each caption in textarea (editable)
    - Add platform badge for each caption
    - Add hashtags as blue tags
    - Add copy-to-clipboard button with confirmation message
    - Update local state on caption edit
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ] 17.2 Create app/dashboard/copywriter/page.tsx
    - Wrap CaptionEditor with PageWrapper (showWorkflow=true)
    - Add page heading "AI Copywriter"
    - _Requirements: 5.1_
  
  - [ ] 17.3 Test copywriter page
    - Navigate to /dashboard/copywriter without strategy
    - Verify "No strategy found" message displays
    - Go back to strategist and generate strategy
    - Return to copywriter and verify captions display
    - Test editing a caption
    - Test copy-to-clipboard button
    - _Requirements: 5.1, 5.2, 5.6_

- [ ] 18. Scheduler Page with Calendar
  - [ ] 18.1 Create Modal component
    - Implement isOpen, onClose, title, children, footer props
    - Add backdrop with click-to-close
    - Add ESC key handler
    - Prevent body scroll when open
    - Use React.createPortal
    - _Requirements: 12.5_
  
  - [ ] 18.2 Create Calendar component
    - Implement month grid view with date cells
    - Display current month and year
    - Add navigation arrows for previous/next month
    - Add click handler to open scheduling modal
    - Display scheduled posts on dates (colored dots)
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 18.3 Create scheduling modal
    - Add Input components for: content, platform (dropdown), date, time
    - Add validation (future date, non-empty content)
    - Add "Schedule Post" Button
    - Save post to local state on submit
    - Close modal and update calendar
    - _Requirements: 6.3, 6.4_
  
  - [ ] 18.4 Add list view toggle
    - Add toggle button above calendar
    - Implement list view showing posts chronologically
    - Add edit and delete buttons for each post
    - Implement delete handler
    - _Requirements: 6.5, 6.6, 6.7_
  
  - [ ] 18.5 Create app/dashboard/scheduler/page.tsx
    - Wrap Calendar with PageWrapper (showWorkflow=true)
    - Add page heading "Content Scheduler"
    - _Requirements: 6.1_
  
  - [ ] 18.6 Test scheduler page
    - Navigate to /dashboard/scheduler
    - Verify calendar displays current month
    - Click a date and verify modal opens
    - Fill form and schedule a post
    - Verify post appears on calendar
    - Toggle to list view and verify post appears
    - Delete a post and verify it's removed
    - _Requirements: 6.2, 6.4, 6.7_

- [ ] 19. Designer Page with Image Generation
  - [ ] 19.1 Create LoadingSkeleton component
    - Implement animated pulse effect
    - Add variant props for different shapes
    - _Requirements: 14.6_
  
  - [ ] 19.2 Create ImageGenerator component
    - Add Input component for image prompt
    - Add "Generate Image" Button with loading state
    - Fetch placeholder image from mockImages.json with 2-second delay
    - Display LoadingSkeleton during generation
    - Add generated image to local state
    - Display grid of generated images (2x2 desktop, 1x1 mobile)
    - Add click handler to open image in Modal
    - Add download button for each image
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ] 19.3 Create app/dashboard/designer/page.tsx
    - Wrap ImageGenerator with PageWrapper (showWorkflow=true)
    - Add page heading "AI Image Designer"
    - _Requirements: 7.1_
  
  - [ ] 19.4 Test designer page
    - Navigate to /dashboard/designer
    - Enter a prompt and click generate
    - Verify loading skeleton appears
    - Verify image displays after 2 seconds
    - Verify image is added to grid
    - Click image and verify modal opens
    - Test download button
    - _Requirements: 7.2, 7.4, 7.6_

- [ ] 20. Publisher Page with Posts Table
  - [ ] 20.1 Create PostsTable component
    - Implement table with columns: Content, Platform, Date, Time, Status, Actions
    - Display StatusBadge for each post
    - Add status filter dropdown (All, Scheduled, Published, Draft)
    - Implement filter logic
    - Sort posts chronologically (nearest first)
    - Add "Publish" Button for scheduled posts
    - Update status to "Published" on click
    - Make responsive (stack into cards on mobile)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ] 20.2 Create app/dashboard/publisher/page.tsx
    - Wrap PostsTable with PageWrapper (showWorkflow=true)
    - Add page heading "Content Publisher"
    - _Requirements: 8.1_
  
  - [ ] 20.3 Test publisher page
    - Navigate to /dashboard/publisher
    - Verify table displays scheduled posts from scheduler
    - Test status filter dropdown
    - Click publish button on a post
    - Verify status updates to "Published"
    - Verify StatusBadge color changes
    - _Requirements: 8.3, 8.5_

- [ ] 21. Checkpoint - All Agent Tools Complete
  - Verify all 5 agent tools work correctly
  - Test complete workflow: Strategist → Copywriter → Scheduler → Designer → Publisher
  - Verify workflow status updates correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Analysis Page with Charts
  - [ ] 22.1 Create AnalyticsCards component
    - Fetch metrics from mockAnalytics.json
    - Create grid layout (4 columns desktop, 2 tablet, 1 mobile)
    - Display metric cards with icon, label, value, percentage change
    - Color-code percentage change (green positive, red negative)
    - Add up/down arrow icons
    - _Requirements: 9.1, 9.2, 9.6_
  
  - [ ] 22.2 Add engagement chart
    - Implement simple line chart using SVG
    - Display engagement trends over time
    - Make responsive
    - _Requirements: 9.3_
  
  - [ ] 22.3 Add platform performance section
    - Display performance by platform in Card components
    - Show posts, engagement, reach for each platform
    - _Requirements: 9.4_
  
  - [ ] 22.4 Add top posts list
    - Display top 5 posts ranked by engagement
    - Show content preview, platform, engagement, reach
    - _Requirements: 9.5_
  
  - [ ] 22.5 Create app/dashboard/analysis/page.tsx
    - Wrap AnalyticsCards with PageWrapper (showWorkflow=false)
    - Add page heading "Analytics Dashboard"
    - _Requirements: 9.1_
  
  - [ ] 22.6 Test analysis page
    - Navigate to /dashboard/analysis
    - Verify workflow is NOT displayed
    - Verify 4 metric cards display
    - Verify engagement chart renders
    - Verify platform performance displays
    - Verify top posts list displays
    - Test responsive layout
    - _Requirements: 9.1, 11.6_

- [ ] 23. Profile Page
  - [ ] 23.1 Create ProfileForm component
    - Add Input components for: name, email, company, bio
    - Add validation (email format, name min length, bio max length)
    - Add "Save Profile" Button
    - Update local state on save
    - Display success message
    - _Requirements: 10.1, 10.3_
  
  - [ ] 23.2 Add connected accounts section
    - Display badges for each platform (Instagram, Twitter, LinkedIn, Facebook)
    - Show connection status with StatusBadge
    - Add "Connect" / "Disconnect" Button for each platform
    - Implement toggle handler
    - Display mock success message
    - Update badge color on toggle
    - _Requirements: 10.2, 10.4, 10.5, 10.6_
  
  - [ ] 23.3 Create app/dashboard/profile/page.tsx
    - Wrap ProfileForm with PageWrapper (showWorkflow=false)
    - Add page heading "Profile Settings"
    - _Requirements: 10.1_
  
  - [ ] 23.4 Test profile page
    - Navigate to /dashboard/profile
    - Verify workflow is NOT displayed
    - Fill profile form and click save
    - Verify success message appears
    - Test account connection toggles
    - Verify badge colors update
    - _Requirements: 10.3, 10.5_

- [ ] 24. Error Handling and Boundaries
  - [ ] 24.1 Create root error boundary
    - Create app/error.tsx
    - Display full-page fallback UI with error message
    - Add "Reload Page" Button
    - Log errors to console
    - _Requirements: 17.4, 17.5_
  
  - [ ] 24.2 Create dashboard error boundary
    - Create app/dashboard/error.tsx
    - Display dashboard-specific fallback UI
    - Preserve sidebar navigation
    - Add "Go to Dashboard Home" Button
    - _Requirements: 17.4_
  
  - [ ] 24.3 Test error boundaries
    - Temporarily add code to throw error in a component
    - Verify error boundary catches it
    - Verify fallback UI displays
    - Verify reload button works
    - Remove test error code
    - _Requirements: 17.4_

- [ ] 25. Responsive Design Polish
  - [ ] 25.1 Test and fix mobile layouts
    - Test all pages at 375px width (mobile)
    - Verify sidebar collapses to hamburger menu
    - Verify all grids stack to single column
    - Verify all text is readable
    - Verify all buttons are touch-friendly (min 44x44px)
    - Fix any layout issues
    - _Requirements: 13.1, 13.2, 13.3, 13.5_
  
  - [ ] 25.2 Test and fix tablet layouts
    - Test all pages at 768px width (tablet)
    - Verify grids adjust to 2 columns
    - Verify sidebar behavior
    - Fix any layout issues
    - _Requirements: 13.2_
  
  - [ ] 25.3 Test and fix desktop layouts
    - Test all pages at 1024px+ width (desktop)
    - Verify full sidebar displays
    - Verify multi-column grids
    - Fix any layout issues
    - _Requirements: 13.1_

- [ ] 26. Accessibility Improvements
  - [ ] 26.1 Add ARIA labels and keyboard navigation
    - Add ARIA labels to icon-only buttons
    - Ensure Tab key navigates through all interactive elements
    - Ensure Enter key activates buttons and submits forms
    - Ensure ESC key closes modals
    - Add focus indicators to all focusable elements
    - _Requirements: 13.5_
  
  - [ ] 26.2 Add skip navigation and semantic HTML
    - Add skip navigation link at top
    - Verify proper heading hierarchy (h1, h2, h3)
    - Use semantic HTML (nav, main, section, article)
    - Associate form labels with inputs
    - _Requirements: 13.5_
  
  - [ ] 26.3 Test with keyboard only
    - Navigate entire site using only keyboard
    - Verify all functionality is accessible
    - Fix any keyboard navigation issues
    - _Requirements: 13.5_

- [ ] 27. Performance Optimization
  - [ ] 27.1 Optimize all images
    - Verify all images use Next.js Image component
    - Add width and height props
    - Add alt text for accessibility
    - Add priority prop to hero image
    - Add loading="lazy" to below-fold images
    - _Requirements: 13.6, 14.1_
  
  - [ ] 27.2 Add loading states
    - Create loading.tsx files for dashboard pages
    - Display LoadingSkeleton components
    - Test loading states by throttling network
    - _Requirements: 14.6_
  
  - [ ] 27.3 Verify bundle size
    - Run production build (npm run build)
    - Check bundle sizes in build output
    - Verify total JavaScript < 500KB gzipped
    - _Requirements: 14.5_

- [ ] 28. Final Testing and Verification
  - [ ] 28.1 Manual testing checklist
    - Test all routes and navigation
    - Test all forms and validation
    - Test all interactive elements
    - Test responsive layouts at all breakpoints
    - Test in Chrome, Firefox, Safari, Edge
    - Verify no console errors or warnings
    - _Requirements: 17.1, 17.2_
  
  - [ ] 28.2 Visual design verification
    - Compare home page to reference images
    - Compare dashboard to Dashboard.png
    - Verify spacing and layout match
    - Verify colors and typography match
    - Fix any visual discrepancies
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  
  - [ ] 28.3 Build and deployment check
    - Run TypeScript type checking (npm run type-check)
    - Run ESLint (npm run lint)
    - Run production build (npm run build)
    - Test production build locally (npm run start)
    - Verify all pages load correctly
    - Verify no build errors or warnings
    - _Requirements: 18.5_

- [ ] 29. Optional: Property-Based Tests
  - [ ]* 29.1 Set up fast-check and write property tests
    - Configure fast-check with Jest
    - Write property tests for all 46 correctness properties
    - Run tests with 100 iterations each
    - Fix any failing tests
    - Generate coverage report
    - _Validates: All requirements_

- [ ] 30. Final Checkpoint
  - Verify complete application works end-to-end
  - Test complete user journey from home page to dashboard
  - Verify all features work as expected
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task produces visible UI changes that can be viewed in the browser immediately
- Run `npm run dev` after each task to see changes at http://localhost:3000
- Tasks are ordered to build incrementally with immediate visual feedback
- Test each feature in the browser before moving to the next task
- Use browser DevTools to test responsive layouts at different breakpoints
- Property-based tests are marked optional (*) for faster MVP delivery
- All code uses TypeScript strict mode with no implicit any types
- All styling uses Tailwind CSS utilities
- All icons use Iconify Solar icon set
- All images use Next.js Image component for optimization
- No backend dependencies or API calls (all data is mocked)