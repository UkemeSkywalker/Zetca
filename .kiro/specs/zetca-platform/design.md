# Design Document: Zetca AI Social Media Automation Platform

## Overview

Zetca is a frontend-only Next.js 16 application built with the App Router, Tailwind CSS, and TypeScript. The platform consists of two main sections: a public marketing website and an authenticated dashboard with five agent tools (Strategist, Copywriter, Scheduler, Designer, Publisher) plus two additional pages (Analysis, Profile). All data is mocked using static JSON files and React state, with no backend dependencies.

The architecture follows a component-driven approach with reusable UI components, centralized mock data management, and a clear separation between public and dashboard sections. The design prioritizes desktop-first responsive layouts, performance optimization through Next.js features, and exact visual fidelity to provided reference images.

## Architecture

### Application Structure

```
zetca-platform/
├── app/
│   ├── layout.tsx                 # Root layout with metadata
│   ├── page.tsx                   # Home page (/)
│   ├── login/
│   │   └── page.tsx               # Login page
│   ├── signup/
│   │   └── page.tsx               # Signup page
│   ├── globals.css                # Global styles and Tailwind imports
│   └── dashboard/
│       ├── layout.tsx             # Dashboard layout with sidebar
│       ├── page.tsx               # Dashboard home (redirects to strategist)
│       ├── strategist/
│       │   └── page.tsx
│       ├── copywriter/
│       │   └── page.tsx
│       ├── scheduler/
│       │   └── page.tsx
│       ├── designer/
│       │   └── page.tsx
│       ├── publisher/
│       │   └── page.tsx
│       ├── analysis/
│       │   └── page.tsx
│       └── profile/
│           └── page.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── PageWrapper.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── StatusBadge.tsx
│   │   └── LoadingSkeleton.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── WaitlistSection.tsx
│   │   └── PricingSection.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── dashboard/
│   │   ├── AgentWorkflow.tsx
│   │   ├── StrategyForm.tsx
│   │   ├── CaptionEditor.tsx
│   │   ├── Calendar.tsx
│   │   ├── ImageGenerator.tsx
│   │   ├── PostsTable.tsx
│   │   ├── AnalyticsCards.tsx
│   │   └── ProfileForm.tsx
│   └── icons/
│       └── SolarIcon.tsx          # Wrapper for Iconify Solar icons
├── context/
│   ├── AgentContext.tsx           # Shared state for agent workflow
│   └── DashboardContext.tsx       # Dashboard-wide state
├── data/
│   ├── mockStrategies.json
│   ├── mockCaptions.json
│   ├── mockPosts.json
│   ├── mockImages.json
│   └── mockAnalytics.json
├── hooks/
│   ├── useAgentWorkflow.ts
│   ├── useLocalStorage.ts
│   └── useMockData.ts
├── types/
│   ├── agent.ts
│   ├── post.ts
│   ├── analytics.ts
│   └── user.ts
├── lib/
│   └── utils.ts                   # Utility functions
└── public/
    └── images/
        ├── Dashboard.png
        ├── Features.png
        ├── Footer.png
        ├── hero-section.png
        ├── Herobg.jpg
        ├── Price.png
        ├── Waitlist.png
        └── placeholders/          # Placeholder images for designer
```

### Routing Strategy

The application uses Next.js App Router with the following route structure:

**Public Routes:**
- `/` - Home page with hero, features, waitlist, pricing sections
- `/login` - Login page (UI only, no authentication)
- `/signup` - Signup page (UI only, no authentication)

**Dashboard Routes:**
- `/dashboard` - Redirects to `/dashboard/strategist`
- `/dashboard/strategist` - Brand strategy generation
- `/dashboard/copywriter` - Caption editing and management
- `/dashboard/scheduler` - Calendar-based post scheduling
- `/dashboard/designer` - AI image generation
- `/dashboard/publisher` - Post publishing management
- `/dashboard/analysis` - Analytics and metrics
- `/dashboard/profile` - User profile and settings

All public routes include a navigation bar with links to Home, Login, Signup, and Dashboard. No authentication is required to access any route.

### State Management Strategy

The application uses a hybrid state management approach:

1. **React Context** - For shared agent workflow state and dashboard-wide data
2. **Local Component State** - For form inputs, UI toggles, and page-specific data
3. **Custom Hooks** - For reusable state logic (useAgentWorkflow, useMockData)

No external state management library is required due to the frontend-only nature and moderate complexity.

## Components and Interfaces

### Layout Components

#### Navbar Component

```typescript
interface NavbarProps {
  className?: string;
}

interface NavLink {
  label: string;
  href: string;
}

const navLinks: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Login', href: '/login' },
  { label: 'Signup', href: '/signup' },
  { label: 'Dashboard', href: '/dashboard' },
];
```

**Behavior:**
- Displays on all public pages (home, login, signup)
- Logo on the left, navigation links on the right
- Responsive: collapses to hamburger menu on mobile (<768px)
- Active link highlighted using Next.js `usePathname` hook
- Sticky positioning at top of viewport
- Uses Tailwind classes: `bg-white shadow-sm fixed top-0 w-full z-50`

#### Sidebar Component

```typescript
interface SidebarProps {
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: string; // Iconify icon name
  isAgentTool: boolean;
}

const navItems: NavItem[] = [
  { label: 'Strategist', href: '/dashboard/strategist', icon: 'solar:lightbulb-bolt-bold', isAgentTool: true },
  { label: 'Copywriter', href: '/dashboard/copywriter', icon: 'solar:pen-bold', isAgentTool: true },
  { label: 'Scheduler', href: '/dashboard/scheduler', icon: 'solar:calendar-bold', isAgentTool: true },
  { label: 'Designer', href: '/dashboard/designer', icon: 'solar:palette-bold', isAgentTool: true },
  { label: 'Publisher', href: '/dashboard/publisher', icon: 'solar:send-square-bold', isAgentTool: true },
  { label: 'Analysis', href: '/dashboard/analysis', icon: 'solar:chart-bold', isAgentTool: false },
  { label: 'Profile', href: '/dashboard/profile', icon: 'solar:user-bold', isAgentTool: false },
];
```

**Behavior:**
- Displays navigation items with icons and labels
- Highlights active route using Next.js `usePathname` hook
- Collapses to hamburger menu on mobile (<768px)
- Fixed position on desktop, overlay on mobile
- Uses Tailwind classes for styling: `bg-gray-900 text-white w-64 h-screen fixed`

#### Footer Component

```typescript
interface FooterProps {
  className?: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}
```

**Behavior:**
- Matches Footer.png reference design exactly
- Displays company logo, social media icons, and link sections
- Responsive grid layout: 4 columns on desktop, 2 on tablet, 1 on mobile
- Uses Iconify Solar icons for social media
- Reused across all public pages

#### PageWrapper Component

```typescript
interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showWorkflow?: boolean;
  className?: string;
}
```

**Behavior:**
- Wraps dashboard pages with consistent padding and layout
- Optionally displays AgentWorkflow component at the top
- Provides semantic HTML structure with proper heading hierarchy
- Applies responsive padding: `px-4 md:px-6 lg:px-8 py-6`

### UI Components

#### Button Component

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  children: React.ReactNode;
}
```

**Styling:**
- Primary: `bg-blue-600 hover:bg-blue-700 text-white`
- Secondary: `bg-gray-600 hover:bg-gray-700 text-white`
- Outline: `border-2 border-blue-600 text-blue-600 hover:bg-blue-50`
- Ghost: `text-gray-700 hover:bg-gray-100`
- Sizes: sm (32px), md (40px), lg (48px)
- Loading state shows spinner icon and disables interaction

#### Card Component

```typescript
interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'elevated';
}
```

**Styling:**
- Default: `bg-white rounded-lg p-6`
- Bordered: `bg-white border border-gray-200 rounded-lg p-6`
- Elevated: `bg-white rounded-lg p-6 shadow-lg`
- Title uses `text-xl font-semibold text-gray-900`
- Description uses `text-sm text-gray-600 mt-1`

#### Input Component

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: string;
  rightIcon?: string;
}
```

**Styling:**
- Base: `w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`
- Error state: `border-red-500 focus:ring-red-500`
- Label: `block text-sm font-medium text-gray-700 mb-1`
- Error text: `text-sm text-red-600 mt-1`

#### Modal Component

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

**Behavior:**
- Renders portal using React.createPortal
- Backdrop: `fixed inset-0 bg-black bg-opacity-50 z-40`
- Modal: `fixed inset-0 z-50 flex items-center justify-center p-4`
- Closes on backdrop click or ESC key
- Prevents body scroll when open
- Animated entrance/exit using Tailwind transitions

#### StatusBadge Component

```typescript
type BadgeStatus = 'scheduled' | 'published' | 'draft' | 'complete' | 'in-progress' | 'not-started';

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}
```

**Styling:**
- Scheduled: `bg-yellow-100 text-yellow-800`
- Published: `bg-green-100 text-green-800`
- Draft: `bg-gray-100 text-gray-800`
- Complete: `bg-green-100 text-green-800`
- In Progress: `bg-blue-100 text-blue-800`
- Not Started: `bg-gray-100 text-gray-800`
- Base: `px-3 py-1 rounded-full text-xs font-medium`

### Home Page Components

#### HeroSection Component

```typescript
interface HeroSectionProps {
  className?: string;
}
```

**Behavior:**
- Matches hero-section.png reference design
- Background image: Herobg.jpg with overlay
- Centered content with headline, subheadline, and CTA button
- Uses Next.js Image component for background
- Responsive text sizing: `text-5xl lg:text-6xl xl:text-7xl`
- CTA button navigates to /dashboard/strategist

#### FeaturesSection Component

```typescript
interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeaturesSectionProps {
  className?: string;
}
```

**Behavior:**
- Matches Features.png reference design
- Grid layout: 3 columns on desktop, 2 on tablet, 1 on mobile
- Each feature card displays icon, title, and description
- Icons from Iconify Solar set
- Hover effect: `hover:shadow-lg transition-shadow duration-300`

#### WaitlistSection Component

```typescript
interface WaitlistSectionProps {
  className?: string;
}

interface WaitlistFormState {
  email: string;
  isSubmitted: boolean;
  error: string | null;
}
```

**Behavior:**
- Matches Waitlist.png reference design
- Email input with validation (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Join button triggers mock submission
- Success message: "Thanks for joining! We'll be in touch soon."
- Error messages: "Please enter a valid email address" or "Email is required"
- Clears input on successful submission
- 2-second delay to simulate API call

#### PricingSection Component

```typescript
interface PricingTier {
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}

interface PricingSectionProps {
  className?: string;
}
```

**Behavior:**
- Matches Price.png reference design
- Grid layout: 3 pricing cards (Free, Pro, Enterprise)
- Popular tier highlighted with border and badge
- Feature list with checkmark icons
- CTA buttons for each tier (UI only, no functionality)

### Auth Page Components

#### LoginForm Component

```typescript
interface LoginFormProps {
  className?: string;
}

interface LoginFormData {
  email: string;
  password: string;
}
```

**Behavior:**
- Form with email and password input fields
- Email validation using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password minimum length validation (8 characters)
- Login button triggers mock authentication
- 1-second delay to simulate API call
- Success message: "Login successful! Redirecting..."
- Redirects to /dashboard on successful submission
- Error messages displayed inline for validation failures
- "Forgot password?" link (UI only, no functionality)
- "Don't have an account? Sign up" link to /signup

#### SignupForm Component

```typescript
interface SignupFormProps {
  className?: string;
}

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}
```

**Behavior:**
- Form with name, email, password, and confirm password fields
- Name minimum length validation (2 characters)
- Email validation using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password minimum length validation (8 characters)
- Password confirmation match validation
- Signup button triggers mock registration
- 1-second delay to simulate API call
- Success message: "Account created! Redirecting..."
- Redirects to /dashboard on successful submission
- Error messages displayed inline for validation failures
- "Already have an account? Log in" link to /login
- Terms of service checkbox (required)

### Dashboard Components

#### AgentWorkflow Component

```typescript
interface WorkflowStep {
  id: string;
  label: string;
  route: string;
  status: 'complete' | 'in-progress' | 'not-started';
}

interface AgentWorkflowProps {
  currentRoute: string;
  className?: string;
}
```

**Behavior:**
- Displays horizontal workflow: Strategist → Copywriter → Scheduler → Designer → Publisher
- Each step shows icon, label, and status badge
- Connecting arrows between steps
- Highlights current step with blue border
- Updates status based on AgentContext state
- Only visible on agent tool pages (not Analysis or Profile)
- Responsive: horizontal on desktop, vertical on mobile

#### StrategyForm Component

```typescript
interface StrategyFormData {
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
}

interface GeneratedStrategy {
  contentPillars: string[];
  postingFrequency: string;
  keyThemes: string[];
  tone: string;
}

interface StrategyFormProps {
  onStrategyGenerated: (strategy: GeneratedStrategy) => void;
}
```

**Behavior:**
- Form with 4 input fields (brandName, industry, targetAudience, goals)
- Generate button triggers 2-second loading state
- Fetches mock strategy from mockStrategies.json
- Displays generated strategy in formatted sections
- Saves strategy to AgentContext for use by Copywriter
- Updates workflow status to mark Strategist as complete

#### CaptionEditor Component

```typescript
interface Caption {
  id: string;
  text: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  hashtags: string[];
}

interface CaptionEditorProps {
  captions: Caption[];
  onCaptionUpdate: (id: string, newText: string) => void;
}
```

**Behavior:**
- Displays list of captions from AgentContext (generated by Strategist)
- Each caption in editable textarea
- Copy-to-clipboard button for each caption
- Platform badge showing target social media
- Hashtags displayed as blue tags
- Auto-saves changes to local state on blur
- Shows "No strategy found" message if Strategist not completed

#### Calendar Component

```typescript
interface ScheduledPost {
  id: string;
  content: string;
  platform: string;
  date: Date;
  time: string;
  status: 'scheduled' | 'published' | 'draft';
}

interface CalendarProps {
  posts: ScheduledPost[];
  onPostSchedule: (post: Omit<ScheduledPost, 'id'>) => void;
  onPostDelete: (id: string) => void;
}
```

**Behavior:**
- Toggle between calendar view and list view
- Calendar view: month grid with post indicators on dates
- List view: chronological list with edit/delete actions
- Click date to open scheduling modal
- Modal contains form: content, platform, date, time
- Saves scheduled posts to local state
- Color-codes posts by platform

#### ImageGenerator Component

```typescript
interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  createdAt: Date;
}

interface ImageGeneratorProps {
  onImageGenerate: (image: GeneratedImage) => void;
}
```

**Behavior:**
- Text input for image generation prompt
- Generate button triggers 2-second loading animation
- Returns placeholder image from mockImages.json
- Displays grid of previously generated images (2x2 on desktop, 1x1 on mobile)
- Click image to view in modal
- Download button triggers browser download
- Images stored in local state

#### PostsTable Component

```typescript
interface Post {
  id: string;
  content: string;
  platform: string;
  scheduledDate: Date;
  status: 'scheduled' | 'published' | 'draft';
}

interface PostsTableProps {
  posts: Post[];
  onPublish: (id: string) => void;
  onStatusFilter: (status: string) => void;
}
```

**Behavior:**
- Table with columns: Content, Platform, Date, Time, Status, Actions
- Status filter dropdown: All, Scheduled, Published, Draft
- Publish button changes status to "Published"
- Status badge updates color on change
- Sorted by date (nearest first)
- Responsive: stacks into cards on mobile

#### AnalyticsCards Component

```typescript
interface Metric {
  label: string;
  value: string;
  change: number; // percentage
  icon: string;
}

interface AnalyticsCardsProps {
  metrics: Metric[];
  className?: string;
}
```

**Behavior:**
- Grid of metric cards: 4 columns on desktop, 2 on tablet, 1 on mobile
- Each card shows icon, label, value, and percentage change
- Positive change: green text with up arrow
- Negative change: red text with down arrow
- Line chart below cards showing engagement over time
- Platform breakdown with bar chart
- Top posts list with engagement metrics

#### ProfileForm Component

```typescript
interface UserProfile {
  name: string;
  email: string;
  company: string;
  bio: string;
}

interface ConnectedAccount {
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  isConnected: boolean;
  username?: string;
}

interface ProfileFormProps {
  profile: UserProfile;
  accounts: ConnectedAccount[];
  onProfileUpdate: (profile: UserProfile) => void;
  onAccountToggle: (platform: string) => void;
}
```

**Behavior:**
- Form with 4 fields: name, email, company, bio
- Save button updates profile in local state
- Success message on save
- Connected accounts section with platform badges
- Connect/Disconnect buttons for each platform
- Mock success message on connection toggle
- Badge color: green for connected, gray for disconnected

## Data Models

### TypeScript Interfaces

```typescript
// types/agent.ts
export interface Strategy {
  id: string;
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
  contentPillars: string[];
  postingFrequency: string;
  keyThemes: string[];
  tone: string;
  createdAt: Date;
}

export interface Caption {
  id: string;
  strategyId: string;
  text: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  hashtags: string[];
  createdAt: Date;
}

export interface WorkflowStatus {
  strategist: 'complete' | 'in-progress' | 'not-started';
  copywriter: 'complete' | 'in-progress' | 'not-started';
  scheduler: 'complete' | 'in-progress' | 'not-started';
  designer: 'complete' | 'in-progress' | 'not-started';
  publisher: 'complete' | 'in-progress' | 'not-started';
}

// types/post.ts
export interface Post {
  id: string;
  content: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  scheduledDate: Date;
  scheduledTime: string;
  status: 'scheduled' | 'published' | 'draft';
  imageUrl?: string;
  captionId?: string;
  createdAt: Date;
  publishedAt?: Date;
}

// types/analytics.ts
export interface Metric {
  label: string;
  value: string | number;
  change: number;
  icon: string;
}

export interface EngagementData {
  date: string;
  engagement: number;
  reach: number;
  clicks: number;
}

export interface PlatformPerformance {
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  posts: number;
  engagement: number;
  reach: number;
}

export interface TopPost {
  id: string;
  content: string;
  platform: string;
  engagement: number;
  reach: number;
  publishedAt: Date;
}

export interface Analytics {
  metrics: Metric[];
  engagementData: EngagementData[];
  platformPerformance: PlatformPerformance[];
  topPosts: TopPost[];
}

// types/user.ts
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  bio: string;
  avatarUrl?: string;
}

export interface ConnectedAccount {
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  isConnected: boolean;
  username?: string;
  connectedAt?: Date;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  width: number;
  height: number;
  createdAt: Date;
}
```

### Mock Data Structure

```json
// data/mockStrategies.json
{
  "strategies": [
    {
      "id": "strategy-1",
      "contentPillars": [
        "Educational content about industry trends",
        "Behind-the-scenes company culture",
        "Customer success stories",
        "Product tips and tutorials"
      ],
      "postingFrequency": "3-4 times per week",
      "keyThemes": [
        "Innovation",
        "Community",
        "Expertise",
        "Authenticity"
      ],
      "tone": "Professional yet approachable, informative with personality"
    }
  ]
}

// data/mockCaptions.json
{
  "captions": [
    {
      "id": "caption-1",
      "text": "Excited to share our latest innovation! 🚀 This new feature will transform how you manage your social media strategy.",
      "platform": "instagram",
      "hashtags": ["#Innovation", "#SocialMedia", "#AI", "#Marketing"]
    }
  ]
}

// data/mockPosts.json
{
  "posts": [
    {
      "id": "post-1",
      "content": "Check out our latest blog post on AI trends!",
      "platform": "twitter",
      "scheduledDate": "2024-02-15T10:00:00Z",
      "scheduledTime": "10:00 AM",
      "status": "scheduled"
    }
  ]
}

// data/mockImages.json
{
  "images": [
    {
      "id": "img-1",
      "url": "/images/placeholders/placeholder-1.jpg",
      "width": 1024,
      "height": 1024
    }
  ]
}

// data/mockAnalytics.json
{
  "metrics": [
    {
      "label": "Engagement Rate",
      "value": "4.8%",
      "change": 12.5,
      "icon": "solar:chart-2-bold"
    },
    {
      "label": "Total Reach",
      "value": "45.2K",
      "change": 8.3,
      "icon": "solar:users-group-rounded-bold"
    },
    {
      "label": "Clicks",
      "value": "2,341",
      "change": -3.2,
      "icon": "solar:cursor-bold"
    },
    {
      "label": "Follower Growth",
      "value": "+1,234",
      "change": 15.7,
      "icon": "solar:graph-up-bold"
    }
  ],
  "engagementData": [
    { "date": "2024-01-01", "engagement": 320, "reach": 4200, "clicks": 180 },
    { "date": "2024-01-02", "engagement": 450, "reach": 5100, "clicks": 220 }
  ],
  "platformPerformance": [
    { "platform": "instagram", "posts": 24, "engagement": 1850, "reach": 18500 },
    { "platform": "twitter", "posts": 45, "engagement": 980, "reach": 12300 }
  ],
  "topPosts": [
    {
      "id": "top-1",
      "content": "Our biggest announcement of the year! 🎉",
      "platform": "instagram",
      "engagement": 1250,
      "reach": 15600,
      "publishedAt": "2024-01-15T14:00:00Z"
    }
  ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before writing the correctness properties, I need to analyze the acceptance criteria from the requirements document to determine which are testable as properties.



### Property Reflection

After analyzing all acceptance criteria, I've identified several areas of redundancy:

**Redundancy Group 1: Component Prop Rendering**
- Properties 12.2-12.6 all test that components render their props correctly
- These can be combined into a single comprehensive property about component prop rendering

**Redundancy Group 2: State Updates**
- Properties 2.1, 5.4, 10.3 all test that user input updates local state
- These can be combined into a single property about state synchronization

**Redundancy Group 3: Status Badge Display**
- Properties 8.2, 11.5 both test that status badges are displayed for items
- These can be combined into a single property about status badge rendering

**Redundancy Group 4: Chronological Ordering**
- Properties 6.6, 8.6 both test chronological ordering of posts
- These can be combined into a single property about post ordering

**Redundancy Group 5: Modal Display**
- Properties 6.3, 7.4 both test modal opening behavior
- These can be combined into a single property about modal interactions

**Redundancy Group 6: Button/Action Availability**
- Properties 5.5, 7.5, 10.4 all test that action buttons are available for items
- These can be combined into a single property about action availability

**Redundancy Group 7: Image Component Usage**
- Properties 13.6, 14.1 both test that Next.js Image component is used
- Property 14.1 subsumes 13.6

**Redundancy Group 8: Sidebar Consistency**
- Properties 3.5, 11.1 both test that UI elements appear consistently across pages
- These can be combined into a single property about layout consistency

After reflection, I'll focus on unique, high-value properties that provide comprehensive coverage without redundancy.

### Correctness Properties

Property 1: Footer Consistency Across Public Pages
*For any* public page route (/, /about, /contact), the footer component should be rendered with consistent content and structure.
**Validates: Requirements 1.7**

Property 2: Email Input State Synchronization
*For any* valid email string entered in the waitlist form, the input value should be reflected in the component's local state immediately.
**Validates: Requirements 2.1**

Property 3: Valid Email Submission Success
*For any* email string matching the pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, submitting the waitlist form should display a success message and clear the input field.
**Validates: Requirements 2.2, 2.5**

Property 4: Invalid Email Rejection
*For any* string that does not match the email pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, submitting the waitlist form should display a validation error message and not clear the input.
**Validates: Requirements 2.4**

Property 5: Sidebar Navigation Without Reload
*For any* sidebar navigation link, clicking it should navigate to the corresponding route without triggering a full page reload (using Next.js client-side navigation).
**Validates: Requirements 3.3**

Property 6: Active Route Highlighting
*For any* dashboard route, the sidebar should highlight the navigation item corresponding to the current active route.
**Validates: Requirements 3.4**

Property 7: Sidebar Presence on Dashboard Routes
*For any* route matching `/dashboard/*`, the sidebar component should be rendered in the layout.
**Validates: Requirements 3.5**

Property 8: Strategy Generation and Storage
*For any* completed strategy form submission, the generated strategy should be stored in the AgentContext state and accessible to other agent components.
**Validates: Requirements 4.2, 4.4**

Property 9: Strategy Output Structure
*For any* generated strategy, the output should contain sections for contentPillars (array), postingFrequency (string), keyThemes (array), and tone (string).
**Validates: Requirements 4.3**

Property 10: Copywriter Dependency on Strategist
*For any* state where no strategy exists in AgentContext, the copywriter page should display a prompt message instead of captions.
**Validates: Requirements 5.1, 5.2 (edge case)**

Property 11: Caption Editability
*For any* caption displayed in the copywriter, the text should be editable through a textarea element, and changes should update the local state immediately.
**Validates: Requirements 5.3, 5.4**

Property 12: Clipboard Copy Functionality
*For any* caption with a copy button, clicking the button should copy the caption text to the clipboard and display a confirmation message.
**Validates: Requirements 5.6**

Property 13: Scheduled Post Display on Calendar
*For any* post in the scheduled posts state with a valid date, the post should appear on the calendar at the corresponding date.
**Validates: Requirements 6.2**

Property 14: Post Scheduling Round Trip
*For any* valid post data submitted through the scheduling modal, the post should be added to local state and immediately visible on the calendar or list view.
**Validates: Requirements 6.4**

Property 15: Post Chronological Ordering
*For any* collection of scheduled posts, when displayed in list view or publisher table, the posts should be ordered chronologically with the nearest scheduled date first.
**Validates: Requirements 6.6, 8.6**

Property 16: Post Deletion Removes from State
*For any* scheduled post, deleting it should remove the post from local state and update all views (calendar, list, publisher table) to no longer display it.
**Validates: Requirements 6.7**

Property 17: Image Generation and Storage
*For any* prompt submitted to the designer, a placeholder image should be generated after a loading period and added to the local state for display in the image grid.
**Validates: Requirements 7.2, 7.3**

Property 18: Modal Display on Interaction
*For any* interactive element configured to open a modal (image click, date click, etc.), clicking the element should display the modal with appropriate content.
**Validates: Requirements 6.3, 7.4**

Property 19: Status Badge Display for Posts
*For any* post displayed in the publisher table, a status badge should be rendered showing the current status (Scheduled, Published, or Draft) with appropriate styling.
**Validates: Requirements 8.2**

Property 20: Publish Action Updates Status
*For any* post with status "Scheduled", clicking the publish button should update the post's status to "Published" in local state and update the status badge immediately.
**Validates: Requirements 8.3, 8.5**

Property 21: Post Status Filtering
*For any* status filter selection (All, Scheduled, Published, Draft), the publisher table should display only posts matching the selected status.
**Validates: Requirements 8.4**

Property 22: Analytics Metrics Display Structure
*For any* metric in the analytics data, the metric should be displayed in a card with an icon, label, value, and percentage change indicator.
**Validates: Requirements 9.2**

Property 23: Top Posts Ranking by Engagement
*For any* collection of posts with engagement metrics, the top posts list should display posts ordered by engagement value in descending order.
**Validates: Requirements 9.5**

Property 24: Profile Update State Synchronization
*For any* profile field edit and save action, the updated values should be stored in local state and persist until page refresh.
**Validates: Requirements 10.3**

Property 25: Account Connection Status Toggle
*For any* social media platform, clicking the connect/disconnect button should toggle the connection status and update the badge display immediately.
**Validates: Requirements 10.5, 10.6**

Property 26: Agent Workflow Display on Agent Pages
*For any* route matching `/dashboard/(strategist|copywriter|scheduler|designer|publisher)`, the agent workflow visualization should be displayed, and for routes `/dashboard/(analysis|profile)`, it should not be displayed.
**Validates: Requirements 11.1, 11.6 (edge case)**

Property 27: Current Agent Highlighting in Workflow
*For any* active agent route, the corresponding agent in the workflow visualization should be highlighted to indicate the current position.
**Validates: Requirements 11.2**

Property 28: Agent Completion Status Display
*For any* agent in the workflow, a status badge should display showing "Complete", "In Progress", or "Not Started" based on the AgentContext state.
**Validates: Requirements 11.3, 11.5**

Property 29: Component Prop Rendering
*For any* reusable UI component (Button, Card, Input, Modal, StatusBadge), all provided props should be correctly rendered in the component's output.
**Validates: Requirements 12.2, 12.3, 12.4, 12.5, 12.6**

Property 30: Status Badge Color Mapping
*For any* status type passed to StatusBadge, the component should display the appropriate color: green for success/published/complete, yellow for scheduled/pending, blue for in-progress, and gray for draft/not-started.
**Validates: Requirements 12.6**

Property 31: Touch-Friendly Element Sizing on Mobile
*For any* interactive element (button, link, input) on viewports below 768px width, the element should have a minimum touch target size of 44x44 pixels.
**Validates: Requirements 13.5**

Property 32: Next.js Image Component Usage
*For any* image rendered in the application, the Next.js Image component should be used instead of standard HTML img tags to enable automatic optimization.
**Validates: Requirements 13.6, 14.1**

Property 33: Loading Skeleton Display During Async Operations
*For any* asynchronous operation (strategy generation, image generation, data fetching), a loading skeleton or spinner should be displayed during the loading period.
**Validates: Requirements 14.6**

Property 34: Mock Data Retrieval
*For any* agent or page requesting data, the data should be retrieved from the appropriate mock data JSON file or local state without making external API calls.
**Validates: Requirements 16.3**

Property 35: State Non-Persistence on Refresh
*For any* state updates made during a session, refreshing the page should reset all state to initial values from mock data files.
**Validates: Requirements 16.5, 16.6**

Property 36: Error Boundary Fallback UI
*For any* component error that occurs during rendering, a React Error Boundary should catch the error and display fallback UI without breaking the entire application.
**Validates: Requirements 17.4**

Property 37: Graceful Error Logging
*For any* error that occurs in the application, the error should be logged to the console without causing the UI to crash or become unresponsive.
**Validates: Requirements 17.5**

Property 38: Solar Icon Set Exclusivity
*For any* icon rendered in the application, the icon should be from the iconify-icons/solar icon set.
**Validates: Requirements 19.1**

Property 39: Metric Card Icon Display
*For any* metric card on the analysis page, an icon should be displayed alongside the metric label and value.
**Validates: Requirements 19.3**

Property 40: Icon Sizing by Context
*For any* icon rendered, the size should be appropriate for its context: 24px for navigation, 32px for feature cards, 16px for inline elements.
**Validates: Requirements 19.5**

Property 41: Page Metadata Implementation
*For any* page in the application, SEO metadata (title, description) should be implemented using Next.js metadata API.
**Validates: Requirements 20.7**

Property 42: Navbar Display on Public Pages
*For any* public page route (/, /login, /signup), the navbar component should be rendered with links to Home, Login, Signup, and Dashboard.
**Validates: Requirements 1.8**

Property 43: Login Form Validation
*For any* email and password combination where the email matches the pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` and password length is at least 8 characters, submitting the login form should display a success message and redirect to /dashboard.
**Validates: Requirements 21.4, 21.6**

Property 44: Signup Form Validation
*For any* name, email, and password combination where name length is at least 2 characters, email matches the pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, and password length is at least 8 characters, submitting the signup form should display a success message and redirect to /dashboard.
**Validates: Requirements 21.5, 21.6**

Property 45: Password Confirmation Match
*For any* signup form submission, if the password and confirm password fields do not match, a validation error message should be displayed and the form should not submit.
**Validates: Requirements 21.6**

Property 46: Dashboard Access Without Authentication
*For any* user navigating to /dashboard or any dashboard sub-route, the page should be accessible without requiring login or authentication checks.
**Validates: Requirements 1.9**

## Error Handling

### Error Boundary Strategy

The application implements React Error Boundaries at strategic levels:

1. **Root Error Boundary** - Wraps the entire application in `app/layout.tsx`
   - Catches catastrophic errors
   - Displays full-page fallback UI with error message and reload button
   - Logs errors to console in development mode

2. **Dashboard Error Boundary** - Wraps dashboard layout in `app/dashboard/layout.tsx`
   - Catches errors in dashboard pages
   - Displays dashboard-specific fallback UI
   - Preserves sidebar navigation for recovery

3. **Component-Level Error Boundaries** - Wrap complex components
   - Modal component errors
   - Chart rendering errors
   - Image generation errors
   - Displays inline fallback UI without breaking parent components

### Form Validation

All forms implement client-side validation:

**Waitlist Form:**
- Email format validation using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Empty field validation
- Error messages displayed below input field
- Submit button disabled during validation errors

**Login Form:**
- Email format validation using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password minimum length validation (8 characters)
- Error messages displayed inline
- Submit button disabled during validation errors
- Mock authentication with 1-second delay
- Redirects to /dashboard on success

**Signup Form:**
- Name minimum length validation (2 characters)
- Email format validation using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password minimum length validation (8 characters)
- Password confirmation match validation
- Terms of service checkbox required
- Error messages displayed inline
- Submit button disabled during validation errors
- Mock registration with 1-second delay
- Redirects to /dashboard on success

**Strategy Form:**
- Required field validation (all fields must be non-empty)
- Minimum length validation (10 characters for goals)
- Error messages displayed inline
- Form submission prevented until valid

**Scheduler Modal:**
- Date validation (must be future date)
- Time validation (must be valid time format)
- Content validation (non-empty, max 280 characters for Twitter)
- Platform selection required

**Profile Form:**
- Email format validation
- Name minimum length (2 characters)
- Bio maximum length (500 characters)
- Success/error messages displayed as toast notifications

### Async Operation Error Handling

All async operations (mock data fetching, simulated API calls) implement try-catch blocks:

```typescript
async function generateStrategy(formData: StrategyFormData): Promise<Strategy> {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fetch mock data
    const mockStrategy = await import('@/data/mockStrategies.json');
    return mockStrategy.strategies[0];
  } catch (error) {
    console.error('Strategy generation failed:', error);
    throw new Error('Failed to generate strategy. Please try again.');
  }
}
```

Error states are communicated to users through:
- Toast notifications for transient errors
- Inline error messages for form validation
- Fallback UI for component errors
- Retry buttons for recoverable errors

### Network Simulation

Since the application is frontend-only with no real API calls, network errors are simulated for realistic error handling:

- Random 5% failure rate for mock API calls
- Timeout simulation (10 second max)
- Error messages match real API error patterns
- Retry logic with exponential backoff

## Testing Strategy

The Zetca platform requires a comprehensive testing approach combining unit tests and property-based tests to ensure correctness across all features.

### Testing Framework Selection

**Unit Testing:**
- Framework: Jest with React Testing Library
- Rationale: Industry standard for React applications, excellent Next.js integration
- Configuration: Jest configured for Next.js App Router with TypeScript support

**Property-Based Testing:**
- Framework: fast-check (JavaScript/TypeScript property-based testing library)
- Rationale: Mature library with excellent TypeScript support, generates hundreds of test cases automatically
- Configuration: Minimum 100 iterations per property test

### Testing Approach

**Unit Tests** - Focus on specific examples, edge cases, and integration points:
- Component rendering with specific props
- User interaction flows (click, type, submit)
- Edge cases (empty states, error states, boundary conditions)
- Integration between components (parent-child communication)
- Mock data loading and display

**Property Tests** - Focus on universal properties across all inputs:
- Form validation across all possible inputs
- State synchronization for any user action
- Component prop rendering for any valid prop combination
- Ordering and filtering for any data set
- Navigation behavior for any route

### Test Organization

```
__tests__/
├── unit/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.test.tsx
│   │   │   ├── Card.test.tsx
│   │   │   ├── Input.test.tsx
│   │   │   ├── Modal.test.tsx
│   │   │   └── StatusBadge.test.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.test.tsx
│   │   │   ├── Footer.test.tsx
│   │   │   └── PageWrapper.test.tsx
│   │   ├── home/
│   │   │   ├── HeroSection.test.tsx
│   │   │   ├── FeaturesSection.test.tsx
│   │   │   ├── WaitlistSection.test.tsx
│   │   │   └── PricingSection.test.tsx
│   │   └── dashboard/
│   │       ├── AgentWorkflow.test.tsx
│   │       ├── StrategyForm.test.tsx
│   │       ├── CaptionEditor.test.tsx
│   │       ├── Calendar.test.tsx
│   │       ├── ImageGenerator.test.tsx
│   │       ├── PostsTable.test.tsx
│   │       ├── AnalyticsCards.test.tsx
│   │       └── ProfileForm.test.tsx
│   └── pages/
│       ├── home.test.tsx
│       └── dashboard/
│           ├── strategist.test.tsx
│           ├── copywriter.test.tsx
│           ├── scheduler.test.tsx
│           ├── designer.test.tsx
│           ├── publisher.test.tsx
│           ├── analysis.test.tsx
│           └── profile.test.tsx
└── properties/
    ├── navigation.properties.test.ts
    ├── forms.properties.test.ts
    ├── state.properties.test.ts
    ├── components.properties.test.ts
    ├── workflow.properties.test.ts
    └── data.properties.test.ts
```

### Property Test Implementation

Each property test must:
1. Reference the design document property number
2. Run minimum 100 iterations
3. Use fast-check generators for input data
4. Include a descriptive tag comment

Example property test structure:

```typescript
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('Property Tests: StatusBadge Component', () => {
  /**
   * Feature: zetca-platform, Property 30: Status Badge Color Mapping
   * For any status type passed to StatusBadge, the component should display 
   * the appropriate color: green for success/published/complete, yellow for 
   * scheduled/pending, blue for in-progress, and gray for draft/not-started.
   */
  it('should display correct color for any status type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('scheduled', 'published', 'draft', 'complete', 'in-progress', 'not-started'),
        (status) => {
          const { container } = render(<StatusBadge status={status} />);
          const badge = container.firstChild as HTMLElement;
          
          const colorMap = {
            'scheduled': 'bg-yellow-100',
            'published': 'bg-green-100',
            'draft': 'bg-gray-100',
            'complete': 'bg-green-100',
            'in-progress': 'bg-blue-100',
            'not-started': 'bg-gray-100',
          };
          
          expect(badge.className).toContain(colorMap[status]);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All 41 correctness properties implemented
- **Integration Test Coverage**: All critical user flows (strategy → copywriter → scheduler → publisher)
- **Component Test Coverage**: 100% of reusable UI components

### Testing Best Practices

1. **Arrange-Act-Assert Pattern**: All unit tests follow AAA structure
2. **Test Isolation**: Each test is independent, no shared state
3. **Mock Data**: Use consistent mock data from `/data` directory
4. **Accessibility Testing**: Include aria-label and role assertions
5. **Responsive Testing**: Test mobile and desktop viewports
6. **Error State Testing**: Test error boundaries and validation
7. **Loading State Testing**: Test loading skeletons and spinners
8. **Property Test Generators**: Create reusable fast-check generators for common data types

### Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Every pull request (CI pipeline)
- Before deployment (pre-deploy check)

CI pipeline includes:
- Unit tests with coverage report
- Property tests with 100 iterations
- TypeScript type checking
- ESLint code quality checks
- Build verification
- Lighthouse performance audit

### Manual Testing Checklist

While automated tests provide comprehensive coverage, manual testing is required for:
- Visual design fidelity against reference images
- Responsive layout at various breakpoints
- Browser compatibility (Chrome, Firefox, Safari, Edge)
- Accessibility with screen readers
- Performance on low-end devices
- Touch interactions on mobile devices

## Implementation Notes

### Development Workflow

1. **Setup Phase**
   - Initialize Next.js 16 project with TypeScript
   - Configure Tailwind CSS with custom theme
   - Set up folder structure
   - Install dependencies (Iconify, fast-check, Jest, React Testing Library)

2. **Foundation Phase**
   - Create TypeScript interfaces in `/types`
   - Create mock data JSON files in `/data`
   - Implement reusable UI components
   - Implement layout components (Sidebar, Footer, PageWrapper)
   - Set up React Context for agent workflow state

3. **Public Website Phase**
   - Implement home page sections (Hero, Features, Waitlist, Pricing)
   - Implement Footer component
   - Test responsive layouts
   - Verify design fidelity against reference images

4. **Dashboard Phase**
   - Implement dashboard layout with sidebar
   - Implement agent workflow visualization
   - Implement each agent page sequentially:
     - Strategist (foundation for other agents)
     - Copywriter (depends on Strategist)
     - Scheduler (independent)
     - Designer (independent)
     - Publisher (depends on Scheduler)
   - Implement Analysis page
   - Implement Profile page

5. **Testing Phase**
   - Write unit tests for all components
   - Write property tests for all correctness properties
   - Run coverage reports
   - Fix failing tests and improve coverage

6. **Polish Phase**
   - Performance optimization (lazy loading, code splitting)
   - Accessibility improvements (ARIA labels, keyboard navigation)
   - Error handling refinement
   - Visual polish and design fidelity verification

### Key Technical Decisions

**Why Next.js App Router?**
- Modern routing with layouts and nested routes
- Built-in performance optimizations (prefetching, code splitting)
- Server and client component flexibility
- Excellent TypeScript support

**Why Tailwind CSS?**
- Utility-first approach matches component-driven architecture
- Responsive design utilities simplify breakpoint management
- Consistent spacing and color scales
- Excellent Next.js integration

**Why React Context over Redux?**
- Simpler setup for frontend-only application
- No complex async actions (all data is mocked)
- Sufficient for moderate state complexity
- Better TypeScript inference

**Why fast-check for Property Testing?**
- Mature library with active maintenance
- Excellent TypeScript support with type inference
- Comprehensive generator library
- Configurable iteration counts and shrinking

**Why Mock Data in JSON Files?**
- Easy to modify without code changes
- Realistic data structure for future API integration
- Centralized data management
- Version control friendly

### Performance Considerations

**Image Optimization:**
- All images use Next.js Image component
- Automatic format conversion (WebP, AVIF)
- Responsive image sizing
- Lazy loading below the fold

**Code Splitting:**
- Dashboard pages dynamically imported
- Chart libraries loaded on demand
- Modal components lazy loaded
- Reduces initial bundle size by ~40%

**Caching Strategy:**
- Static assets cached indefinitely
- Mock data cached in memory
- Component memoization for expensive renders
- Route prefetching for instant navigation

**Bundle Size Targets:**
- Initial bundle: < 200KB gzipped
- Dashboard bundle: < 150KB gzipped
- Total JavaScript: < 500KB gzipped
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s

### Accessibility Requirements

**WCAG 2.1 Level AA Compliance:**
- Color contrast ratio minimum 4.5:1 for text
- All interactive elements keyboard accessible
- Focus indicators visible on all focusable elements
- ARIA labels for icon-only buttons
- Semantic HTML structure (nav, main, section, article)
- Skip navigation link for keyboard users
- Form labels associated with inputs
- Error messages announced to screen readers

**Keyboard Navigation:**
- Tab order follows visual order
- Modal traps focus when open
- ESC key closes modals
- Enter key submits forms
- Arrow keys navigate calendar

**Screen Reader Support:**
- Meaningful alt text for all images
- ARIA live regions for dynamic content updates
- ARIA labels for complex widgets (calendar, workflow)
- Status messages announced on state changes

### Browser Support

**Target Browsers:**
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile Safari: iOS 14+
- Chrome Mobile: Android 10+

**Polyfills:**
- None required (Next.js handles modern JavaScript features)
- CSS Grid and Flexbox supported natively
- Tailwind CSS handles vendor prefixes

### Deployment Considerations

**Static Export:**
- Application can be exported as static HTML/CSS/JS
- No server-side rendering required
- Deploy to any static hosting (Vercel, Netlify, S3)

**Environment Variables:**
- None required (no API keys or secrets)
- All configuration in code

**Build Optimization:**
- Production build minifies and optimizes all assets
- Tree shaking removes unused code
- Image optimization at build time
- CSS purging removes unused Tailwind classes

This design provides a comprehensive blueprint for implementing the Zetca platform with clear component interfaces, data models, correctness properties, error handling strategies, and testing approaches. The architecture prioritizes maintainability, performance, and exact visual fidelity to the reference designs.
