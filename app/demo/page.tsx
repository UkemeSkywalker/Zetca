import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">UI Components Demo</h1>
        </div>

        {/* Button Variants */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Button Variants</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Primary Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" size="sm">Small Primary</Button>
                <Button variant="primary" size="md">Medium Primary</Button>
                <Button variant="primary" size="lg">Large Primary</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Secondary Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="secondary" size="sm">Small Secondary</Button>
                <Button variant="secondary" size="md">Medium Secondary</Button>
                <Button variant="secondary" size="lg">Large Secondary</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Outline Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" size="sm">Small Outline</Button>
                <Button variant="outline" size="md">Medium Outline</Button>
                <Button variant="outline" size="lg">Large Outline</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Ghost Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="ghost" size="sm">Small Ghost</Button>
                <Button variant="ghost" size="md">Medium Ghost</Button>
                <Button variant="ghost" size="lg">Large Ghost</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Loading States</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" isLoading>Loading...</Button>
                <Button variant="secondary" isLoading>Loading...</Button>
                <Button variant="outline" isLoading>Loading...</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" leftIcon="solar:add-circle-bold">Add Item</Button>
                <Button variant="secondary" rightIcon="solar:arrow-right-bold">Next</Button>
                <Button variant="outline" leftIcon="solar:download-bold">Download</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Disabled State</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" disabled>Disabled Primary</Button>
                <Button variant="secondary" disabled>Disabled Secondary</Button>
                <Button variant="outline" disabled>Disabled Outline</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Input Components */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Input Components</h2>
          
          <div className="space-y-6 max-w-md">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Basic Inputs</h3>
              <div className="space-y-4">
                <Input placeholder="Enter text..." />
                <Input label="Email Address" type="email" placeholder="you@example.com" />
                <Input label="Password" type="password" placeholder="Enter password" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">With Helper Text</h3>
              <Input 
                label="Username" 
                placeholder="johndoe" 
                helperText="Choose a unique username"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">With Error State</h3>
              <Input 
                label="Email" 
                type="email" 
                placeholder="you@example.com" 
                error="Please enter a valid email address"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">With Icons</h3>
              <div className="space-y-4">
                <Input 
                  label="Search" 
                  placeholder="Search..." 
                  leftIcon="solar:magnifer-bold"
                />
                <Input 
                  label="Email" 
                  type="email" 
                  placeholder="you@example.com" 
                  leftIcon="solar:letter-bold"
                />
                <Input 
                  label="Password" 
                  type="password" 
                  placeholder="Enter password" 
                  rightIcon="solar:eye-bold"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Card Components */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Card Components</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card variant="default" title="Default Card" description="This is a default card variant">
              <p>Card content goes here. This is the default style with no border or shadow.</p>
            </Card>

            <Card variant="bordered" title="Bordered Card" description="This card has a border">
              <p>Card content with a subtle border around it for better definition.</p>
            </Card>

            <Card variant="elevated" title="Elevated Card" description="This card has a shadow">
              <p>Card content with an elevated shadow effect for emphasis.</p>
            </Card>

            <Card 
              variant="bordered" 
              title="Card with Actions" 
              description="This card includes action buttons"
              actions={
                <div className="flex gap-2">
                  <Button variant="primary" size="sm">Save</Button>
                  <Button variant="outline" size="sm">Cancel</Button>
                </div>
              }
            >
              <p>This card demonstrates how to add action buttons at the bottom.</p>
            </Card>

            <Card variant="elevated">
              <p>Card without title or description, just content.</p>
            </Card>

            <Card variant="bordered" title="Feature Card">
              <div className="space-y-3">
                <p className="text-sm">✓ Feature one</p>
                <p className="text-sm">✓ Feature two</p>
                <p className="text-sm">✓ Feature three</p>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
