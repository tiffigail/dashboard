import React from 'react';
import { Lightbulb, Search, Repeat, Handshake, Target, Sparkles, Heart, Calendar, Clock, Users, CheckSquare, List, Box, Package, BookOpen, User, UserCheck, UserCog } from 'lucide-react';

function App() {
  const scrumData = {
    pillars: [
      {
        name: 'Transparency',
        icon: <Lightbulb className="w-10 h-10 text-blue-600" />,
        description: 'The emergent process and work must be **visible** to those performing the work as well as those receiving the work. Important decisions are based on the perceived state of its three formal artifacts.'
      },
      {
        name: 'Inspection',
        icon: <Search className="w-10 h-10 text-blue-600" />,
        description: 'The Scrum artifacts and the progress toward agreed goals must be **inspected frequently and diligently** to detect potentially undesirable variances or problems. Scrum provides cadence in the form of its five events for inspection.'
      },
      {
        name: 'Adaptation',
        icon: <Repeat className="w-10 h-10 text-blue-600" />,
        description: 'If any aspects of a process deviate outside acceptable limits or if the resulting product is unacceptable, the process or materials must be **adjusted as soon as possible** to minimize further deviation.'
      },
    ],
    values: [
      {
        name: 'Commitment',
        icon: <Handshake className="w-10 h-10 text-green-600" />,
        description: 'The Scrum Team **commits** to achieving its goals and to supporting each other.'
      },
      {
        name: 'Focus',
        icon: <Target className="w-10 h-10 text-green-600" />,
        description: 'Their primary **focus** is on the work of the Sprint to make the best possible progress toward these goals.'
      },
      {
        name: 'Openness',
        icon: <BookOpen className="w-10 h-10 text-green-600" />,
        description: 'The Scrum Team and its stakeholders are **open** about the work and the challenges.'
      },
      {
        name: 'Respect',
        icon: <Users className="w-10 h-10 text-green-600" />,
        description: 'Scrum Team members **respect** each other to be capable, independent people, and are respected as such by the people with whom they work.'
      },
      {
        name: 'Courage',
        icon: <Sparkles className="w-10 h-10 text-green-600" />,
        description: 'The Scrum Team members have the **courage** to do the right thing, to work on tough problems.'
      },
    ],
    events: [
      {
        name: 'The Sprint',
        icon: <Heart className="w-10 h-10 text-purple-600" />,
        description: 'The **heartbeat of Scrum**, where ideas are turned into value. Fixed length events of **one month or less**. All other Scrum events happen within the Sprint.'
      },
      {
        name: 'Sprint Planning',
        icon: <Calendar className="w-10 h-10 text-purple-600" />,
        description: '**Initiates the Sprint** by laying out the work to be performed. The Scrum Team collaborates to define the **Sprint Goal** and select Product Backlog items.'
      },
      {
        name: 'Daily Scrum',
        icon: <Clock className="w-10 h-10 text-purple-600" />,
        description: 'A **15-minute event** for Developers to inspect progress toward the Sprint Goal and adapt the Sprint Backlog as necessary, adjusting upcoming planned work.'
      },
      {
        name: 'Sprint Review',
        icon: <Users className="w-10 h-10 text-purple-600" />,
        description: 'To **inspect the outcome of the Sprint** and determine future adaptations. The Scrum Team presents results to stakeholders and discusses progress toward the Product Goal.'
      },
      {
        name: 'Sprint Retrospective',
        icon: <CheckSquare className="w-10 h-10 text-purple-600" />,
        description: 'To **plan ways to increase quality and effectiveness**. The Scrum Team inspects how the last Sprint went and identifies improvements for the next Sprint.'
      },
    ],
    artifacts: [
      {
        name: 'Product Backlog',
        icon: <List className="w-10 h-10 text-red-600" />,
        commitment: 'Product Goal',
        description: 'An emergent, ordered list of what is needed to improve the product. It is the **single source of work** undertaken by the Scrum Team. The Product Goal is the long-term objective for the Scrum Team.'
      },
      {
        name: 'Sprint Backlog',
        icon: <Box className="w-10 h-10 text-red-600" />,
        commitment: 'Sprint Goal',
        description: 'Composed of the **Sprint Goal (why)**, the set of Product Backlog items selected for the Sprint (**what**), and an actionable plan for delivering the Increment (**how**). The Sprint Goal is the single objective for the Sprint.'
      },
      {
        name: 'Increment',
        icon: <Package className="w-10 h-10 text-red-600" />,
        commitment: 'Definition of Done',
        description: 'A **concrete stepping stone** toward the Product Goal. Each Increment is additive to all prior Increments and thoroughly verified, ensuring they work together. The Definition of Done is a formal description of the state of the Increment when it meets quality measures.'
      },
    ],
    roles: [
      {
        name: 'Product Owner',
        icon: <User className="w-10 h-10 text-yellow-600" />,
        description: 'Accountable for **maximizing the value** of the product resulting from the work of the Scrum Team. Accountable for effective Product Backlog management.'
      },
      {
        name: 'Scrum Master',
        icon: <UserCheck className="w-10 h-10 text-yellow-600" />,
        description: 'Accountable for **establishing Scrum** as defined in the Scrum Guide. They serve the Scrum Team and the larger organization by helping everyone understand Scrum theory and practice.'
      },
      {
        name: 'Developers',
        icon: <UserCog className="w-10 h-10 text-yellow-600" />,
        description: 'The people in the Scrum Team that are committed to creating any aspect of a **usable Increment** each Sprint. They are accountable for creating the Sprint Backlog, instilling quality, adapting their plan daily, and holding each other accountable.'
      },
    ]
  };

  const Section = ({ title, items, colorClass }) => (
    <div className="mb-16 p-8 bg-white rounded-2xl shadow-xl">
      <h2 className={`text-4xl font-extrabold text-center mb-10 ${colorClass}`}>{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {items.map((item, index) => (
          <div key={index} className="flex flex-col items-center text-center p-8 bg-gray-50 rounded-xl shadow-md transition-transform transform hover:scale-105 duration-300">
            <div className="p-4 rounded-full shadow-lg mb-6 bg-blue-50"> {/* Added bg-blue-50 here */}
              {item.icon}
            </div>
            <h3 className="text-2xl font-extrabold mb-3">{item.name}</h3>
            {item.commitment && (
              <p className="text-base text-gray-600 mb-3 italic font-semibold">Commitment: {item.commitment}</p>
            )}
            <p className="text-gray-700 text-base leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-10 font-inter">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        `}
      </style>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-6xl font-extrabold text-center text-gray-900 mb-16 leading-tight">
          Understanding Scrum: <br/> A Comprehensive Guide to Agile Delivery
        </h1>

        <Section title="Scrum Pillars: The Foundation of Empiricism" items={scrumData.pillars} colorClass="text-blue-700" />
        <Section title="Scrum Values: Guiding Principles" items={scrumData.values} colorClass="text-green-700" />
        <Section title="Scrum Events: The Heartbeat of Progress" items={scrumData.events} colorClass="text-purple-700" />
        <Section title="Scrum Artifacts: Transparency & Commitment" items={scrumData.artifacts} colorClass="text-red-700" />

        <div className="mb-16 p-8 bg-white rounded-2xl shadow-xl">
          <h2 className="text-4xl font-extrabold text-center mb-10 text-yellow-700">Scrum Roles: The Scrum Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {scrumData.roles.map((role, index) => (
              <div key={index} className="flex flex-col items-center text-center p-8 bg-gray-50 rounded-xl shadow-md transition-transform transform hover:scale-105 duration-300">
                <div className="p-4 rounded-full shadow-lg mb-6 bg-blue-50"> {/* Added bg-blue-50 here */}
                  {role.icon}
                </div>
                <h3 className="text-2xl font-extrabold mb-3">{role.name}</h3>
                <p className="text-gray-700 text-base leading-relaxed">{role.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-white rounded-2xl shadow-xl text-center text-gray-700">
          <h2 className="text-3xl font-bold mb-6">Why Scrum is Effective</h2>
          <p className="mb-4 text-lg leading-relaxed">
            Scrum is founded on **empiricism** (knowledge comes from experience and making decisions based on observation) and **lean thinking** (reducing waste and focusing on essentials). It employs an **iterative, incremental approach** to optimize predictability and control risk.
          </p>
          <p className="mb-4 text-lg leading-relaxed">
            The framework is purposefully incomplete, relying on the **collective intelligence** of the people using it. Its rules guide relationships and interactions, making visible the relative efficacy of current management, environment, and work techniques, thereby enabling **continuous improvement**.
          </p>
          <p className="text-sm italic text-gray-500 mt-8">
            Based on "The Scrum Guide" by Ken Schwaber & Jeff Sutherland, November 2020.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
