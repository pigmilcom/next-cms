# Content Blocks System

The Content Blocks system allows administrators to create reusable content blocks that can be dynamically displayed throughout the frontend website.

## Features

### Admin Panel
- **Rich Text Editor**: WYSIWYG editor powered by ReactQuill for rich content creation
- **Multiple Block Types**: 
  - HTML Code blocks for custom HTML
  - Rich Text blocks for formatted content
  - Form blocks for interactive forms
  - Layout blocks for structural content
- **Advanced Features**:
  - Custom CSS and JavaScript per block
  - Tagging system for organization
  - Active/Inactive status toggle
  - Slug-based access
  - Search and filtering capabilities
- **Full CRUD Operations**: Create, Read, Update, Delete blocks with confirmation
- **Copy Slug**: Quick copy-to-clipboard functionality for easy integration

### Frontend Integration
- **React Components**: Ready-to-use components for displaying blocks
- **Custom Hooks**: `useBlocks` and `useBlock` hooks for data fetching
- **Public API**: RESTful endpoints for frontend consumption
- **Auto-injection**: Custom CSS and JS are automatically injected when blocks load

## Usage

### Creating Blocks (Admin)
1. Navigate to **Admin → Store → Blocks**
2. Click **"Add Block"**
3. Fill in the form:
   - **Name**: Display name for the block
   - **Slug**: URL-friendly identifier (auto-generated from name)
   - **Type**: Choose from HTML, Rich Text, Form, or Layout
   - **Content**: Use the rich text editor or HTML input
   - **Tags**: Add tags for organization
   - **Custom CSS/JS**: Add custom styling or functionality
4. Set as **Active** to make it available on the frontend

### Using Blocks in Frontend Components

#### Single Block
```jsx
import Block from '@/components/Block';

function MyPage() {
  return (
    <div>
      <Block 
        slug="welcome-message" 
        className="my-custom-class"
        fallback={<p>Block not found</p>}
      />
    </div>
  );
}
```

#### Multiple Blocks
```jsx
import BlocksList from '@/components/BlocksList';

function MyPage() {
  return (
    <div>
      <BlocksList 
        type="text" 
        limit={5}
        className="space-y-4"
        itemClassName="border p-4 rounded"
      />
    </div>
  );
}
```

#### Using Hooks Directly
```jsx
import { useBlock, useBlocks } from '@/hooks/useBlocks';

function MyComponent() {
  // Single block
  const { block, loading, error } = useBlock('my-block-slug');
  
  // Multiple blocks
  const { blocks, loading, error } = useBlocks({ type: 'html' });
  
  // Handle the data...
}
```

## API Endpoints

### Admin Endpoints (Authentication Required)
- **GET** `/api/query/blocks` - Get all blocks
- **POST** `/api/query/blocks` - Create new block
- **PUT** `/api/query/blocks?id={id}` - Update block
- **DELETE** `/api/query/blocks?id={id}` - Delete block

### Public Endpoints
- **GET** `/api/query/public/blocks` - Get all active blocks
- **GET** `/api/query/public/blocks?slug={slug}` - Get specific block by slug
- **GET** `/api/query/public/blocks?type={type}` - Get blocks by type
- **GET** `/api/query/public/blocks?active=false` - Include inactive blocks

## Block Types

### 1. HTML Code Blocks
- Raw HTML content
- Custom CSS and JavaScript support
- Perfect for widgets, embeds, and custom components

### 2. Rich Text Blocks
- WYSIWYG editor with formatting options
- Headers, lists, links, images
- Ideal for articles, announcements, and formatted content

### 3. Form Blocks
- Interactive form elements
- Custom styling and validation
- Great for contact forms, surveys, and data collection

### 4. Layout Blocks
- Structural content blocks
- Grid layouts, containers, and sections
- Useful for page templates and layouts

## Data Structure

```javascript
{
  id: "unique-id",
  name: "Block Name",
  slug: "block-slug",
  type: "html|text|form|layout",
  content: "Block content...",
  description: "Optional description",
  isActive: true,
  tags: ["tag1", "tag2"],
  customCSS: "/* Custom styles */",
  customJS: "// Custom scripts",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

## Security Considerations

- Admin endpoints require authentication
- Public endpoints only return active blocks by default
- Custom JavaScript is executed in browser context
- Sanitization should be considered for user-generated content

## Demo

Visit `/blocks-demo` to see live examples of how blocks work in the frontend.

## Navigation

The Blocks feature has been added to the admin navigation under:
**Store → Blocks**