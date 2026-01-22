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

- [ ] 7. Home Page - Waitlist Section
  - [ ] 7.1 Create WaitlistSection component
    - Add section heading "Join the Waitlist"
    - Add email Input component
    - Add "Join Now" Button component
    - Implement email validation (regex pattern)
    - Add success/error message display
    - Implement 2-second delay simulation on submit
    - Clear input on success
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 7.2 Add WaitlistSection to home page
    - Add below FeaturesSection in app/page.tsx
    - Test email validation with valid/invalid emails
    - Verify success message appears after delay
    - Verify input clears on success
    - _Requirements: 1.1_

- [ ] 8. Home Page - Pricing Section
  - [ ] 8.1 Create PricingSection component
    - Create grid with 3 pricing cards (Free, Pro, Enterprise)
    - Add pricing details, features lists with checkmarks
    - Highlight "Pro" tier with blue border and "Popular" badge
    - Add CTA buttons (UI only)
    - _Requirements: 1.5_
  
  - [ ] 8.2 Add PricingSection to home page
    - Add below WaitlistSection in app/page.tsx
    - Verify 3-column grid on desktop
    - Verify Pro tier is highlighted
    - _Requirements: 1.1_

- [ ] 9. Home Page - Footer
  - [ ] 9.1 Create Footer component
    - Create 4-column grid (Product, Company, Resources, Legal)
    - Add social media icons (Instagram, Twitter, LinkedIn, Facebook)
    - Add copyright text
    - Make responsive (2 columns tablet, 1 column mobile)
    - _Requirements: 1.6, 1.7_
  
  - [ ] 9.2 Add Footer to root layout
    - Update app/layout.tsx to include Footer below children
    - Verify footer appears on all pages
    - Test responsive grid layout
    - _Requirements: 1.7_

- [ ] 10. Checkpoint - Home Page Complete
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

- [ ] 1. Project Setup and Foundation
  - Initialize Next.js 16 project with TypeScript and App Router
  - Configure Tailwind CSS with custom theme colors and spacing
  - Set up folder structure (/app, /components, /types, /data, /hooks, /context, /lib)
  - Install dependencies: @iconify/react, fast-check, jest, @testing-library/react
  - Create tsconfig.json with strict mode enabled
  - Create .gitignore and README.md
  - _Requirements: 20.1, 20.5, 18.4_

- [ ] 2. TypeScript Interfaces and Mock Data
  - [ ] 2.1 Create TypeScript interfaces in /types directory
    - Define Strategy, Caption, Post, Analytics, UserProfile, ConnectedAccount, GeneratedImage interfaces
    - Export all interfaces from index.ts
    - _Requirements: 18.1, 18.6_
  
  - [ ] 2.2 Create mock data JSON files in /data directory
    - Create mockStrategies.json with 3 sample strategies
    - Create mockCaptions.json with 10 sample captions for different platforms
    - Create mockPosts.json with 15 sample scheduled posts
    - Create mockImages.json with 6 placeholder image URLs
    - Create mockAnalytics.json with metrics, engagement data, platform performance, and top posts
    - _Requirements: 16.1, 16.2_

- [ ] 3. Reusable UI Components
  - [ ] 3.1 Create Button component
    - Implement variant props (primary, secondary, outline, ghost)
    - Implement size props (sm, md, lg)
    - Add loading state with spinner icon
    - Add leftIcon and rightIcon support using Iconify
    - _Requirements: 12.2_
  
  - [ ] 3.2 Create Input component
    - Implement label, error, helperText props
    - Add leftIcon and rightIcon support
    - Implement error state styling
    - Add focus ring styling
    - _Requirements: 12.4_
  
  - [ ] 3.3 Create Card component
    - Implement title, description, children, actions props
    - Add variant props (default, bordered, elevated)
    - Apply responsive padding
    - _Requirements: 12.3_
  
  - [ ] 3.4 Create Modal component
    - Implement isOpen, onClose, title, children, footer props
    - Add size props (sm, md, lg, xl)
    - Implement backdrop with click-to-close
    - Add ESC key handler to close
    - Prevent body scroll when open
    - Use React.createPortal for rendering
    - _Requirements: 12.5_
  
  - [ ] 3.5 Create StatusBadge component
    - Implement status prop with types (scheduled, published, draft, complete, in-progress, not-started)
    - Map status to colors (green, yellow, gray, blue)
    - Apply rounded-full styling with appropriate padding
    - _Requirements: 12.6_
  
  - [ ] 3.6 Create LoadingSkeleton component
    - Implement animated pulse effect
    - Add variant props for different skeleton shapes (text, circle, rectangle)
    - _Requirements: 14.6_
  
  - [ ]* 3.7 Write property tests for UI components
    - **Property 29: Component Prop Rendering**
    - **Validates: Requirements 12.2, 12.3, 12.4, 12.5, 12.6**
  
  - [ ]* 3.8 Write property test for StatusBadge color mapping
    - **Property 30: Status Badge Color Mapping**
    - **Validates: Requirements 12.6**

- [ ] 4. Layout Components
  - [ ] 4.1 Create Navbar component
    - Implement navigation links (Home, Login, Signup, Dashboard)
    - Add logo on the left
    - Implement active link highlighting using usePathname
    - Add responsive hamburger menu for mobile (<768px)
    - Apply sticky positioning at top
    - _Requirements: 1.8_
  
  - [ ] 4.2 Create Footer component
    - Match Footer.png reference design
    - Implement responsive grid layout (4 columns desktop, 2 tablet, 1 mobile)
    - Add social media icons using Iconify Solar
    - Add link sections (Product, Company, Resources, Legal)
    - _Requirements: 1.6, 1.7_
  
  - [ ] 4.3 Create Sidebar component
    - Implement navigation items for all dashboard pages
    - Add icons using Iconify Solar (lightbulb, pen, calendar, palette, send, chart, user)
    - Implement active route highlighting using usePathname
    - Add responsive behavior (fixed on desktop, overlay on mobile)
    - _Requirements: 3.2, 3.4_
  
  - [ ] 4.4 Create PageWrapper component
    - Implement title, description, showWorkflow, children props
    - Add responsive padding (px-4 md:px-6 lg:px-8 py-6)
    - Conditionally render AgentWorkflow component
    - _Requirements: 12.1_
  
  - [ ]* 4.5 Write property test for footer consistency
    - **Property 1: Footer Consistency Across Public Pages**
    - **Validates: Requirements 1.7**
  
  - [ ]* 4.6 Write property test for sidebar presence on dashboard routes
    - **Property 7: Sidebar Presence on Dashboard Routes**
    - **Validates: Requirements 3.5**

- [ ] 5. Context and State Management
  - [ ] 5.1 Create AgentContext
    - Define context interface with strategy, captions, workflowStatus
    - Implement provider component with useState hooks
    - Add methods to update strategy, captions, and workflow status
    - Export useAgentContext hook
    - _Requirements: 4.4, 5.1_
  
  - [ ] 5.2 Create custom hooks
    - Implement useLocalStorage hook for persistent state
    - Implement useMockData hook for fetching mock data with simulated delay
    - Implement useAgentWorkflow hook for workflow status management
    - _Requirements: 16.3, 16.4_

- [ ] 6. Root Layout and Global Styles
  - [ ] 6.1 Create app/layout.tsx
    - Implement root layout with HTML structure
    - Add metadata for SEO (title, description)
    - Import globals.css
    - Wrap children with error boundary
    - _Requirements: 20.2, 20.7_
  
  - [ ] 6.2 Create app/globals.css
    - Import Tailwind directives (@tailwind base, components, utilities)
    - Add custom CSS for animations and transitions
    - Define custom Tailwind theme colors
    - _Requirements: 13.4_

- [ ] 7. Home Page Components
  - [ ] 7.1 Create HeroSection component
    - Match hero-section.png reference design
    - Use Herobg.jpg as background image with Next.js Image
    - Implement centered content with headline, subheadline, CTA button
    - Add responsive text sizing (text-5xl lg:text-6xl xl:text-7xl)
    - CTA button links to /dashboard/strategist
    - _Requirements: 1.2_
  
  - [ ] 7.2 Create FeaturesSection component
    - Match Features.png reference design
    - Implement grid layout (3 columns desktop, 2 tablet, 1 mobile)
    - Create feature cards with icon, title, description
    - Add hover effect (shadow-lg transition)
    - Use Iconify Solar icons
    - _Requirements: 1.3_
  
  - [ ] 7.3 Create WaitlistSection component
    - Match Waitlist.png reference design
    - Implement email input with validation
    - Add join button with click handler
    - Implement success/error message display
    - Add 2-second delay to simulate API call
    - Clear input on successful submission
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 7.4 Create PricingSection component
    - Match Price.png reference design
    - Implement grid layout with 3 pricing cards
    - Highlight popular tier with border and badge
    - Add feature lists with checkmark icons
    - Add CTA buttons (UI only)
    - _Requirements: 1.5_
  
  - [ ]* 7.5 Write property tests for waitlist form
    - **Property 2: Email Input State Synchronization**
    - **Property 3: Valid Email Submission Success**
    - **Property 4: Invalid Email Rejection**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

- [ ] 8. Home Page Assembly
  - Create app/page.tsx
  - Import and render HeroSection, FeaturesSection, WaitlistSection, PricingSection, Footer
  - Wrap page with Navbar at top
  - Ensure sections render in correct order
  - Add metadata for SEO
  - _Requirements: 1.1, 1.8_

- [ ] 9. Checkpoint - Verify Home Page
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Auth Pages
  - [ ] 10.1 Create LoginForm component
    - Implement email and password input fields
    - Add email validation (regex pattern)
    - Add password length validation (min 8 characters)
    - Implement submit handler with 1-second delay
    - Display success message and redirect to /dashboard
    - Add "Forgot password?" link (UI only)
    - Add "Don't have an account? Sign up" link to /signup
    - _Requirements: 21.1, 21.4, 21.6_
  
  - [ ] 10.2 Create SignupForm component
    - Implement name, email, password, confirm password fields
    - Add name length validation (min 2 characters)
    - Add email validation (regex pattern)
    - Add password length validation (min 8 characters)
    - Add password confirmation match validation
    - Add terms of service checkbox (required)
    - Implement submit handler with 1-second delay
    - Display success message and redirect to /dashboard
    - Add "Already have an account? Log in" link to /login
    - _Requirements: 21.2, 21.5, 21.6_
  
  - [ ] 10.3 Create app/login/page.tsx
    - Import and render LoginForm
    - Add Navbar at top
    - Add Footer at bottom
    - Center form on page with max-width
    - Add metadata for SEO
    - _Requirements: 21.1, 21.3_
  
  - [ ] 10.4 Create app/signup/page.tsx
    - Import and render SignupForm
    - Add Navbar at top
    - Add Footer at bottom
    - Center form on page with max-width
    - Add metadata for SEO
    - _Requirements: 21.2, 21.3_
  
  - [ ]* 10.5 Write property tests for auth forms
    - **Property 43: Login Form Validation**
    - **Property 44: Signup Form Validation**
    - **Property 45: Password Confirmation Match**
    - **Validates: Requirements 21.4, 21.5, 21.6**

- [ ] 11. Dashboard Layout
  - [ ] 11.1 Create app/dashboard/layout.tsx
    - Implement layout with Sidebar and main content area
    - Match Dashboard.png reference design
    - Wrap children with AgentContext provider
    - Add responsive layout (sidebar fixed on desktop, overlay on mobile)
    - _Requirements: 3.1_
  
  - [ ] 11.2 Create app/dashboard/page.tsx
    - Implement redirect to /dashboard/strategist using Next.js redirect
    - _Requirements: 1.9_
  
  - [ ]* 11.3 Write property test for dashboard access
    - **Property 46: Dashboard Access Without Authentication**
    - **Validates: Requirements 1.9**

- [ ] 12. Agent Workflow Visualization
  - [ ] 12.1 Create AgentWorkflow component
    - Implement horizontal workflow display (Strategist → Copywriter → Scheduler → Designer → Publisher)
    - Add icons and labels for each agent
    - Implement status badges for each agent
    - Add connecting arrows between agents
    - Highlight current agent based on active route
    - Hide on Analysis and Profile pages
    - Make responsive (vertical on mobile)
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6_
  
  - [ ]* 12.2 Write property tests for agent workflow
    - **Property 26: Agent Workflow Display on Agent Pages**
    - **Property 27: Current Agent Highlighting in Workflow**
    - **Property 28: Agent Completion Status Display**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.5, 11.6**

- [ ] 13. Strategist Page
  - [ ] 13.1 Create StrategyForm component
    - Implement form with fields: brandName, industry, targetAudience, goals
    - Add required field validation
    - Add minimum length validation for goals (10 characters)
    - Implement generate button with loading state
    - Fetch mock strategy from mockStrategies.json with 2-second delay
    - Display generated strategy in formatted sections
    - Save strategy to AgentContext
    - Update workflow status to mark Strategist as complete
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 13.2 Create app/dashboard/strategist/page.tsx
    - Import and render StrategyForm
    - Wrap with PageWrapper (showWorkflow=true)
    - Add metadata for SEO
    - _Requirements: 4.1_
  
  - [ ]* 13.3 Write property tests for strategy generation
    - **Property 8: Strategy Generation and Storage**
    - **Property 9: Strategy Output Structure**
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [ ] 14. Copywriter Page
  - [ ] 14.1 Create CaptionEditor component
    - Fetch captions from AgentContext
    - Display "No strategy found" message if no strategy exists
    - Render each caption in editable textarea
    - Implement onChange handler to update local state
    - Add copy-to-clipboard button for each caption
    - Display platform badge for each caption
    - Display hashtags as blue tags
    - Show confirmation message on copy
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ] 14.2 Create app/dashboard/copywriter/page.tsx
    - Import and render CaptionEditor
    - Wrap with PageWrapper (showWorkflow=true)
    - Add metadata for SEO
    - _Requirements: 5.1_
  
  - [ ]* 14.3 Write property tests for copywriter
    - **Property 10: Copywriter Dependency on Strategist**
    - **Property 11: Caption Editability**
    - **Property 12: Clipboard Copy Functionality**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6**

- [ ] 15. Scheduler Page
  - [ ] 15.1 Create Calendar component
    - Implement month grid view with date cells
    - Display scheduled posts on corresponding dates
    - Add click handler to open scheduling modal
    - Color-code posts by platform
    - Implement navigation between months
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 15.2 Add list view toggle to Calendar component
    - Implement toggle button between calendar and list view
    - Create list view with chronological post display
    - Add edit and delete actions for each post in list view
    - _Requirements: 6.5, 6.6_
  
  - [ ] 15.3 Create scheduling modal
    - Implement form with fields: content, platform, date, time
    - Add validation (future date, valid time, non-empty content)
    - Add platform-specific validation (280 chars for Twitter)
    - Implement save handler to add post to local state
    - Close modal on successful save
    - _Requirements: 6.3, 6.4_
  
  - [ ] 15.4 Implement post deletion
    - Add delete button to each post in list view
    - Implement delete handler to remove from local state
    - Update calendar and list view immediately
    - _Requirements: 6.7_
  
  - [ ] 15.5 Create app/dashboard/scheduler/page.tsx
    - Import and render Calendar component
    - Wrap with PageWrapper (showWorkflow=true)
    - Add metadata for SEO
    - _Requirements: 6.1_
  
  - [ ]* 15.6 Write property tests for scheduler
    - **Property 13: Scheduled Post Display on Calendar**
    - **Property 14: Post Scheduling Round Trip**
    - **Property 15: Post Chronological Ordering**
    - **Property 16: Post Deletion Removes from State**
    - **Validates: Requirements 6.2, 6.4, 6.6, 6.7**

- [ ] 16. Checkpoint - Verify Agent Workflow
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Designer Page
  - [ ] 17.1 Create ImageGenerator component
    - Implement text input for image prompts
    - Add generate button with loading state (2-second delay)
    - Fetch placeholder image from mockImages.json
    - Add generated image to local state
    - Display grid of generated images (2x2 desktop, 1x1 mobile)
    - Implement click handler to open image in modal
    - Add download button for each image
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ] 17.2 Create app/dashboard/designer/page.tsx
    - Import and render ImageGenerator
    - Wrap with PageWrapper (showWorkflow=true)
    - Add metadata for SEO
    - _Requirements: 7.1_
  
  - [ ]* 17.3 Write property tests for designer
    - **Property 17: Image Generation and Storage**
    - **Property 18: Modal Display on Interaction**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [ ] 18. Publisher Page
  - [ ] 18.1 Create PostsTable component
    - Implement table with columns: Content, Platform, Date, Time, Status, Actions
    - Display StatusBadge for each post
    - Add status filter dropdown (All, Scheduled, Published, Draft)
    - Implement filter logic to show only matching posts
    - Sort posts chronologically (nearest first)
    - Add publish button for scheduled posts
    - Implement publish handler to update status to "Published"
    - Update StatusBadge immediately on status change
    - Make responsive (stack into cards on mobile)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ] 18.2 Create app/dashboard/publisher/page.tsx
    - Import and render PostsTable
    - Wrap with PageWrapper (showWorkflow=true)
    - Add metadata for SEO
    - _Requirements: 8.1_
  
  - [ ]* 18.3 Write property tests for publisher
    - **Property 19: Status Badge Display for Posts**
    - **Property 20: Publish Action Updates Status**
    - **Property 21: Post Status Filtering**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6**

- [ ] 19. Analysis Page
  - [ ] 19.1 Create AnalyticsCards component
    - Fetch metrics from mockAnalytics.json
    - Implement grid layout (4 columns desktop, 2 tablet, 1 mobile)
    - Create metric cards with icon, label, value, percentage change
    - Color-code percentage change (green for positive, red for negative)
    - Add up/down arrow icons
    - _Requirements: 9.1, 9.2, 9.6_
  
  - [ ] 19.2 Add engagement chart to AnalyticsCards
    - Implement line chart using HTML canvas or SVG
    - Display engagement trends over time from mockAnalytics.json
    - Make responsive
    - _Requirements: 9.3_
  
  - [ ] 19.3 Add platform performance breakdown
    - Display performance by platform (Instagram, Twitter, LinkedIn, Facebook)
    - Use bar chart or card layout
    - Show posts, engagement, reach for each platform
    - _Requirements: 9.4_
  
  - [ ] 19.4 Add top posts list
    - Display top-performing posts ranked by engagement
    - Show content, platform, engagement, reach for each post
    - _Requirements: 9.5_
  
  - [ ] 19.5 Create app/dashboard/analysis/page.tsx
    - Import and render AnalyticsCards
    - Wrap with PageWrapper (showWorkflow=false)
    - Add metadata for SEO
    - _Requirements: 9.1_
  
  - [ ]* 19.6 Write property tests for analysis
    - **Property 22: Analytics Metrics Display Structure**
    - **Property 23: Top Posts Ranking by Engagement**
    - **Validates: Requirements 9.2, 9.5**

- [ ] 20. Profile Page
  - [ ] 20.1 Create ProfileForm component
    - Implement form with fields: name, email, company, bio
    - Add validation (email format, name min length, bio max length)
    - Implement save handler to update local state
    - Display success message on save
    - _Requirements: 10.1, 10.3_
  
  - [ ] 20.2 Add connected accounts section to ProfileForm
    - Display badges for each platform (Instagram, Twitter, LinkedIn, Facebook)
    - Show connection status (Connected/Not Connected)
    - Add Connect/Disconnect buttons
    - Implement toggle handler to update connection status
    - Display mock success message on toggle
    - Update badge color (green for connected, gray for disconnected)
    - _Requirements: 10.2, 10.4, 10.5, 10.6_
  
  - [ ] 20.3 Create app/dashboard/profile/page.tsx
    - Import and render ProfileForm
    - Wrap with PageWrapper (showWorkflow=false)
    - Add metadata for SEO
    - _Requirements: 10.1_
  
  - [ ]* 20.4 Write property tests for profile
    - **Property 24: Profile Update State Synchronization**
    - **Property 25: Account Connection Status Toggle**
    - **Validates: Requirements 10.3, 10.5, 10.6**

- [ ] 21. Checkpoint - Verify All Dashboard Pages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Error Handling and Boundaries
  - [ ] 22.1 Create root error boundary
    - Implement error.tsx in app directory
    - Display full-page fallback UI with error message
    - Add reload button
    - Log errors to console in development
    - _Requirements: 17.4, 17.5_
  
  - [ ] 22.2 Create dashboard error boundary
    - Implement error.tsx in app/dashboard directory
    - Display dashboard-specific fallback UI
    - Preserve sidebar navigation
    - _Requirements: 17.4_
  
  - [ ]* 22.3 Write property tests for error handling
    - **Property 36: Error Boundary Fallback UI**
    - **Property 37: Graceful Error Logging**
    - **Validates: Requirements 17.4, 17.5**

- [ ] 23. Responsive Design and Accessibility
  - [ ] 23.1 Add responsive breakpoints to all components
    - Verify all components use Tailwind responsive utilities (sm:, md:, lg:, xl:)
    - Test layouts at 1024px, 768px, and 375px viewports
    - Ensure touch-friendly sizes on mobile (min 44x44px)
    - _Requirements: 13.1, 13.2, 13.3, 13.5_
  
  - [ ] 23.2 Add accessibility features
    - Add ARIA labels to icon-only buttons
    - Ensure keyboard navigation works (Tab, Enter, ESC)
    - Add focus indicators to all interactive elements
    - Verify color contrast ratios (min 4.5:1)
    - Add skip navigation link
    - Associate form labels with inputs
    - _Requirements: 13.5_
  
  - [ ]* 23.3 Write property test for touch-friendly sizing
    - **Property 31: Touch-Friendly Element Sizing on Mobile**
    - **Validates: Requirements 13.5**

- [ ] 24. Performance Optimization
  - [ ] 24.1 Optimize images
    - Verify all images use Next.js Image component
    - Add responsive sizing props
    - Add lazy loading for below-the-fold images
    - _Requirements: 13.6, 14.1_
  
  - [ ] 24.2 Implement code splitting
    - Add dynamic imports for dashboard pages
    - Add loading.tsx files for loading states
    - Lazy load chart libraries
    - _Requirements: 14.2, 14.6_
  
  - [ ]* 24.3 Write property tests for performance features
    - **Property 32: Next.js Image Component Usage**
    - **Property 33: Loading Skeleton Display During Async Operations**
    - **Validates: Requirements 13.6, 14.1, 14.6**

- [ ] 25. Icon Integration
  - [ ] 25.1 Create SolarIcon wrapper component
    - Implement wrapper for Iconify Solar icons
    - Add size and color props
    - Apply consistent styling
    - _Requirements: 19.1_
  
  - [ ] 25.2 Add icons throughout application
    - Add navigation icons to sidebar
    - Add metric icons to analysis cards
    - Add social media icons to footer and profile
    - Verify all icons are from Solar set
    - Apply appropriate sizing (24px nav, 32px features, 16px inline)
    - _Requirements: 19.2, 19.3, 19.4, 19.5, 19.6_
  
  - [ ]* 25.3 Write property tests for icons
    - **Property 38: Solar Icon Set Exclusivity**
    - **Property 39: Metric Card Icon Display**
    - **Property 40: Icon Sizing by Context**
    - **Validates: Requirements 19.1, 19.3, 19.5**

- [ ] 26. Final Testing and Polish
  - [ ]* 26.1 Write remaining property tests
    - **Property 5: Sidebar Navigation Without Reload**
    - **Property 6: Active Route Highlighting**
    - **Property 34: Mock Data Retrieval**
    - **Property 35: State Non-Persistence on Refresh**
    - **Property 41: Page Metadata Implementation**
    - **Property 42: Navbar Display on Public Pages**
    - **Validates: Requirements 3.3, 3.4, 16.3, 16.5, 16.6, 20.7, 1.8**
  
  - [ ]* 26.2 Run full test suite
    - Execute all unit tests with coverage report
    - Execute all property tests with 100 iterations
    - Verify minimum 80% code coverage
    - Fix any failing tests
  
  - [ ] 26.3 Manual testing checklist
    - Test all routes and navigation
    - Verify responsive layouts at all breakpoints
    - Test form validation and error states
    - Verify design fidelity against reference images
    - Test keyboard navigation and accessibility
    - Check browser compatibility (Chrome, Firefox, Safari, Edge)
  
  - [ ] 26.4 Build and deployment verification
    - Run TypeScript type checking (no errors)
    - Run ESLint (no errors or warnings)
    - Build production bundle (npm run build)
    - Verify bundle sizes meet targets (<500KB total)
    - Test production build locally
    - Verify no console errors or warnings

- [ ] 27. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- All tasks build incrementally with no orphaned code
- Checkpoints ensure validation at key milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: foundation → components → pages → testing
- All code uses TypeScript strict mode with no implicit any types
- All styling uses Tailwind CSS utilities
- All icons use Iconify Solar icon set
- All images use Next.js Image component for optimization
- No backend dependencies or API calls (all data is mocked)
