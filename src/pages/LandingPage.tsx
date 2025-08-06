import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Scissors, Zap, Clock, ChefHat } from 'lucide-react';

const LandingPage: React.FC = () => {
  const features = [
    {
      icon: <Scissors className="h-8 w-8 text-blue-600" />,
      title: 'Smart Clipping',
      description: 'AI automatically identifies the best moments in your videos for maximum engagement.'
    },
    {
      icon: <Zap className="h-8 w-8 text-blue-600" />,
      title: 'Lightning Fast',
      description: 'Process hours of content in minutes with our advanced AI algorithms.'
    },
    {
      icon: <Play className="h-8 w-8 text-blue-600" />,
      title: 'Multi-Platform',
      description: 'Generate clips optimized for TikTok, Instagram, YouTube Shorts, and more.'
    },
    {
      icon: <Clock className="h-8 w-8 text-blue-600" />,
      title: 'Save Time',
      description: 'Reduce editing time by 90% and focus on creating more amazing content.'
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full">
                <ChefHat className="h-5 w-5 text-blue-600" />
                <span className="text-blue-600 font-medium text-sm">AI-Powered Video Magic</span>
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Turn Long Videos Into
              <span className="text-blue-600 block">Viral Clips</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              ClipChef uses advanced AI to automatically extract the most engaging moments from your 
              long-form content and create platform-ready clips that drive views and engagement.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/signup"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start Creating Clips
              </Link>
              <Link
                to="/about"
                className="text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors duration-200 border border-blue-200"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-20"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full opacity-20"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Creators Choose ClipChef
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI understands what makes content engaging and helps you create clips that captivate your audience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 text-center"
              >
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Content?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already using ClipChef to grow their audience 
            and save time on video editing.
          </p>
          <Link
            to="/signup"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg inline-block"
          >
            Get Started for Free
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;