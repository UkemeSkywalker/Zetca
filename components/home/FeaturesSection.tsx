'use client';

import SolarIcon from '@/components/icons/SolarIcon';

interface Feature {
  emoji: string;
  title: string;
  description: string;
}

interface FeaturesSectionProps {
  className?: string;
}

const features: Feature[] = [
  {
    emoji: 'game-icons:brain',
    title: 'Strategy Agent',
    description: 'Automated content planning based on your brand goals and audience.',
  },
  {
    emoji: 'solar:pen-new-square-bold',
    title: 'Copywriter Agent',
    description: 'High-converting captions, hooks, and CTAs generated instantly.',
  },
  {
    emoji: 'vaadin:palete',
    title: 'Designer Agent',
    description: 'Create stunning visuals and creatives without design skills.',
  },
  {
    emoji: 'solar:calendar-mark-bold',
    title: 'Scheduler Agent',
    description: 'Queue and schedule posts at the best times automatically.',
  },
  {
    emoji: 'solar:rocket-2-bold',
    title: 'Publisher Agent',
    description: 'Publish content across platforms with one click.',
  },
  {
    emoji: 'solar:chart-2-bold',
    title: 'Analytics Dashboard',
    description: 'Track growth, engagement, and performance in real time.',
  },
];

export default function FeaturesSection({ className = '' }: FeaturesSectionProps) {
  return (
    <section className={`py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-blue-50/40 via-purple-50/40 to-blue-50/40 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-100/80 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <SolarIcon icon="solar:widget-bold" size={16} color="#7c3aed" />
            <span>Process</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6" style={{ color: '#1e1b4b' }}>
            How it works
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Zetca simplifies social media management by converting your ideas into engaging content. Create, schedule, and publish across all platforms effortlessly.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left Column - Features List */}
            <div className="space-y-6">
              <div className="mb-10">
                <p className="text-sm md:text-base text-gray-500 mb-3">AI-Powered Automation</p>
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5" style={{ color: '#1e1b4b' }}>
                  Complete Social Media Suite
                </h3>
                <p className="text-base md:text-lg text-gray-600 leading-relaxed">
                  From strategy to publishing, our AI agents handle every aspect of your social media presence, giving you more time to focus on growing your business.
                </p>
              </div>

              {/* Collapsible Feature Items */}
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-purple-50/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <SolarIcon icon={feature.emoji} size={24} color="#7c3aed" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    <SolarIcon 
                      icon="solar:alt-arrow-down-bold" 
                      size={20} 
                      color="#9ca3af"
                      className="flex-shrink-0 mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Visual Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-100 rounded-2xl p-8 shadow-lg">
              <div className="space-y-6">
                {/* Expandable Section */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Content Strategy</h4>
                    <SolarIcon icon="solar:alt-arrow-up-bold" size={20} color="#9ca3af" />
                  </div>
                  <p className="text-sm md:text-base text-gray-600 mb-6 leading-relaxed">
                    AI-generated strategies tailored to your brand, audience, and goals for maximum engagement.
                  </p>
                  
                  {/* Nested Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <SolarIcon icon="solar:pen-bold" size={20} color="#6b7280" />
                        <span className="text-sm md:text-base font-medium text-gray-700">Content Creation</span>
                      </div>
                      <SolarIcon icon="solar:alt-arrow-down-bold" size={16} color="#9ca3af" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <SolarIcon icon="solar:calendar-bold" size={20} color="#6b7280" />
                        <span className="text-sm md:text-base font-medium text-gray-700">Post Scheduling</span>
                      </div>
                      <SolarIcon icon="solar:alt-arrow-down-bold" size={16} color="#9ca3af" />
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <SolarIcon icon="solar:chart-bold" size={24} color="#3b82f6" />
                      </div>
                      <div>
                        <p className="text-2xl md:text-3xl font-bold text-gray-900">2.4K</p>
                        <p className="text-xs md:text-sm text-gray-500">Total Posts</p>
                      </div>
                    </div>
                    <span className="text-xs md:text-sm text-green-500 font-medium">+12.5%</span>
                  </div>

                  <div className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                        <SolarIcon icon="solar:heart-bold" size={24} color="#f97316" />
                      </div>
                      <div>
                        <p className="text-2xl md:text-3xl font-bold text-gray-900">45.2K</p>
                        <p className="text-xs md:text-sm text-gray-500">Engagement</p>
                      </div>
                    </div>
                    <span className="text-xs md:text-sm text-green-500 font-medium">+8.3%</span>
                  </div>

                  <div className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <SolarIcon icon="solar:users-group-rounded-bold" size={24} color="#a855f7" />
                      </div>
                      <div>
                        <p className="text-2xl md:text-3xl font-bold text-gray-900">18.5K</p>
                        <p className="text-xs md:text-sm text-gray-500">New Followers</p>
                      </div>
                    </div>
                    <span className="text-xs md:text-sm text-green-500 font-medium">+15.7%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
