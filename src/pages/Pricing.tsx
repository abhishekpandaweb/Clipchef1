import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Star } from 'lucide-react';

const Pricing: React.FC = () => {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out ClipChef',
      features: [
        '3 videos per month',
        '10 minutes max video length',
        'Basic AI clipping',
        'Standard export quality',
        'Community support'
      ],
      buttonText: 'Get Started',
      buttonStyle: 'bg-gray-600 hover:bg-gray-700 text-white'
    },
    {
      name: 'Starter',
      price: '$9.99',
      period: 'per month',
      description: 'Great for regular content creators',
      features: [
        '25 videos per month',
        '2 hours max video length',
        'Advanced AI clipping',
        'HD export quality',
        'Email support',
        'Custom branding removal'
      ],
      buttonText: 'Start Free Trial',
      buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
      popular: true
    },
    {
      name: 'Pro',
      price: '$19.99',
      period: 'per month',
      description: 'For professional creators and teams',
      features: [
        'Unlimited videos',
        'No video length limit',
        'Premium AI features',
        '4K export quality',
        'Priority support',
        'API access',
        'Team collaboration',
        'Advanced analytics'
      ],
      buttonText: 'Start Free Trial',
      buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  ];

  return (
    <div className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Choose the plan that fits your content creation needs. All plans include our core AI clipping features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 hover:shadow-lg ${
                plan.popular 
                  ? 'border-blue-500 shadow-blue-100' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">/{plan.period}</span>
                </div>

                <Link
                  to="/signup"
                  className={`block w-full text-center py-3 px-4 rounded-lg font-semibold transition-colors duration-200 mb-6 ${plan.buttonStyle}`}
                >
                  {plan.buttonText}
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                How does the AI clipping work?
              </h3>
              <p className="text-gray-600">
                Our AI analyzes your video content to identify the most engaging moments, 
                considering factors like speech patterns, visual changes, and audience retention patterns.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access 
                to your plan features until the end of your billing period.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                What video formats do you support?
              </h3>
              <p className="text-gray-600">
                We support all major video formats including MP4, MOV, AVI, MKV, and more. 
                Our system automatically optimizes uploads for the best processing experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;