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
    <section id="features" className={`py-22 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-surface-container-low/40 via-surface/40 to-surface-container-low/40 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <SolarIcon icon="solar:widget-bold" size={16} color="var(--primary)" />
            <span>Process</span>
          </div>
          <h2 className="text-display-md font-heading text-on-surface mb-6">
            How it works
          </h2>
          <p className="text-lg md:text-xl text-outline max-w-2xl mx-auto leading-relaxed">
            Zetca simplifies social media management by converting your ideas into engaging content. Create, schedule, and publish across all platforms effortlessly.
          </p>
        </div>

        {/* Two Column Layout - surface-container-lowest card */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-ambient p-8 md:p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="mb-10">
                <p className="text-label-md text-outline mb-3">AI-Powered Automation</p>
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading text-on-surface mb-5" style={{ letterSpacing: '-0.02em' }}>
                  Complete Social Media Suite
                </h3>
                <p className="text-body-md text-outline leading-relaxed">
                  From strategy to publishing, our AI agents handle every aspect of your social media presence, giving you more time to focus on growing your business.
                </p>
              </div>

              {/* Feature Items */}
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer group"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <SolarIcon icon={feature.emoji} size={24} color="var(--primary)" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-headline-sm font-heading text-on-surface mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-body-md text-outline leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    <SolarIcon 
                      icon="solar:alt-arrow-down-bold" 
                      size={20} 
                      color="var(--outline)"
                      className="flex-shrink-0 mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Visual Card */}
            <div className="bg-gradient-to-br from-surface-container-low to-surface-container-highest rounded-2xl p-8 shadow-ambient-sm">
              <div className="space-y-6">
                {/* Expandable Section */}
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-headline-sm font-heading text-on-surface">Content Strategy</h4>
                    <SolarIcon icon="solar:alt-arrow-up-bold" size={20} color="var(--outline)" />
                  </div>
                  <p className="text-body-md text-outline mb-6 leading-relaxed">
                    AI-generated strategies tailored to your brand, audience, and goals for maximum engagement.
                  </p>
                  
                  {/* Nested Items - alternating surface tints, no dividers */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                      <div className="flex items-center gap-3">
                        <SolarIcon icon="solar:pen-bold" size={20} color="var(--outline)" />
                        <span className="text-label-md font-medium text-on-surface/80">Content Creation</span>
                      </div>
                      <SolarIcon icon="solar:alt-arrow-down-bold" size={16} color="var(--outline)" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                      <div className="flex items-center gap-3">
                        <SolarIcon icon="solar:calendar-bold" size={20} color="var(--outline)" />
                        <span className="text-label-md font-medium text-on-surface/80">Post Scheduling</span>
                      </div>
                      <SolarIcon icon="solar:alt-arrow-down-bold" size={16} color="var(--outline)" />
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="space-y-3">
                  {[
                    { icon: 'solar:chart-bold', color: 'var(--primary)', bg: 'bg-primary/10', value: '2.4K', label: 'Total Posts', change: '+12.5%' },
                    { icon: 'solar:heart-bold', color: 'var(--secondary)', bg: 'bg-secondary/10', value: '45.2K', label: 'Engagement', change: '+8.3%' },
                    { icon: 'solar:users-group-rounded-bold', color: 'var(--primary-container)', bg: 'bg-primary-container/15', value: '18.5K', label: 'New Followers', change: '+15.7%' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-surface-container-lowest rounded-xl p-5 shadow-ambient-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
                          <SolarIcon icon={stat.icon} size={24} color={stat.color} />
                        </div>
                        <div>
                          <p className="text-2xl md:text-3xl font-bold font-heading text-on-surface">{stat.value}</p>
                          <p className="text-label-sm text-outline">{stat.label}</p>
                        </div>
                      </div>
                      <span className="text-label-sm text-emerald-600 font-medium">{stat.change}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
