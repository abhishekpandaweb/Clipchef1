import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Target, Users, Lightbulb } from 'lucide-react';

const About: React.FC = () => {
  const values = [
    {
      icon: <Target className="h-8 w-8 text-blue-600" />,
      title: 'Creator-First',
      description: 'Everything we build is designed with creators in mind, helping you focus on what you do best.'
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-blue-600" />,
      title: 'Innovation',
      description: 'We leverage cutting-edge AI technology to solve real problems in content creation.'
    },
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: 'Community',
      description: 'Building a supportive community where creators can learn, grow, and succeed together.'
    }
  ];

  const team = [
    {
      name: 'Sarah Chen',
      role: 'CEO & Co-founder',
      description: 'Former YouTube creator with 2M+ subscribers. Passionate about empowering creators.',
      image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1'
    },
    {
      name: 'Marcus Rodriguez',
      role: 'CTO & Co-founder',
      description: 'AI researcher with 10+ years in machine learning and video processing.',
      image: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1'
    },
    {
      name: 'Emily Parker',
      role: 'Head of Product',
      description: 'Product designer focused on creating intuitive experiences for creators.',
      image: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1'
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="py-20 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <ChefHat className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Our Mission
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We believe every creator deserves the tools to turn their passion into a thriving business. 
            ClipChef empowers creators to maximize their content's reach without spending hours on editing.
          </p>
        </div>
      </div>

      {/* Story Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
              The ClipChef Story
            </h2>
            
            <div className="prose prose-lg text-gray-600 leading-relaxed space-y-6">
              <p>
                ClipChef was born from a simple frustration: spending more time editing than creating. 
                Our founders, both content creators themselves, knew there had to be a better way to 
                repurpose long-form content into engaging social media clips.
              </p>
              
              <p>
                After countless hours spent manually editing podcasts into TikToks and YouTube videos 
                into Instagram Reels, we realized that AI could revolutionize this process. What if 
                technology could identify the best moments in your content automatically?
              </p>
              
              <p>
                Today, ClipChef serves thousands of creators worldwide, from podcasters and YouTubers 
                to course creators and business leaders. Our AI has processed millions of minutes of 
                content, learning what makes clips engaging and helping creators grow their audiences.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            What Drives Us
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-sm text-center">
                <div className="flex justify-center mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            Meet the Team
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {member.name}
                </h3>
                <p className="text-blue-600 font-medium mb-3">
                  {member.role}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {member.description}
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
            Ready to Join the ClipChef Community?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Start transforming your long-form content into viral clips today.
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

export default About;