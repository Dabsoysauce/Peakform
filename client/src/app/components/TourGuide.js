'use client';
import { useState, useEffect, useRef } from 'react';

const PLAYER_STEPS = [
  {
    target: null,
    title: '👋 Welcome to Athlete Edge!',
    body: "You're all set up. Let's take a quick 30-second tour so you know exactly where everything is.",
    position: 'center',
  },
  {
    target: '[data-tour="nav-workouts"]',
    title: '🏋️ Log Your Workouts',
    body: 'Track every training session — sets, reps, weight, duration. Build a history coaches can actually see.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-goals"]',
    title: '🎯 Set Goals',
    body: 'Set targets for vertical jump, sprint times, bench press and more. Get notified the moment you hit them.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-media"]',
    title: '🎬 Film Room',
    body: 'Upload game film and practice clips. Get AI-powered breakdowns of your form, footwork, and mechanics.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-team"]',
    title: '🤝 Join Your Team',
    body: "Enter the join code your coach gave you to connect with your team, see announcements, and get assigned workouts.",
    position: 'right',
  },
  {
    target: '[data-tour="nav-messages"]',
    title: '💬 Messages',
    body: 'Send direct messages to your coach or teammates. Your coach can also reach out to you here.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-profile"]',
    title: '👤 Complete Your Profile',
    body: "Add your height, weight, GPA, and bio. This is what coaches see when they're recruiting — make it count.",
    position: 'right',
  },
  {
    target: null,
    title: "🏆 You're good to go!",
    body: "Start by logging your first workout or completing your profile. Your future coach is already looking.",
    position: 'center',
  },
];

const COACH_STEPS = [
  {
    target: null,
    title: '👋 Welcome, Coach!',
    body: "Let's do a quick tour so you can hit the ground running with your team.",
    position: 'center',
  },
  {
    target: '[data-tour="nav-teams"]',
    title: '👥 Create Your Team',
    body: 'Set up a team and share the join code with your players. You can have multiple teams and broadcast rooms.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-athletes"]',
    title: '🔍 Browse Players',
    body: 'Search and view player profiles across the platform. See their stats, goals, film, and training history.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-playbook"]',
    title: '📋 Playbook',
    body: 'Draw up plays on an interactive court. Hit "Ask AI For Help" and describe your team — the AI will design a custom play for you.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-messages"]',
    title: '💬 Messages',
    body: 'Send direct messages to any of your players. You can also share play analysis and film breakdowns straight to their DMs.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-profile"]',
    title: '👤 Set Up Your Profile',
    body: 'Add your specialty, certifications, and bio so players can find and trust you.',
    position: 'right',
  },
  {
    target: null,
    title: "🏀 Ready to coach!",
    body: "Start by creating your first team and sharing the join code with your players.",
    position: 'center',
  },
];

export default function TourGuide({ role }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [spotlightStyle, setSpotlightStyle] = useState(null);
  const tooltipRef = useRef(null);

  const steps = role === 'trainer' ? COACH_STEPS : PLAYER_STEPS;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    const done = localStorage.getItem('tourCompleted');
    if (!done) {
      // Small delay so the layout finishes rendering
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    positionTooltip();
  }, [step, visible]);

  function positionTooltip() {
    const s = steps[step];
    if (!s.target || s.position === 'center') {
      setSpotlightStyle(null);
      setTooltipStyle({ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    const el = document.querySelector(s.target);
    if (!el) {
      setSpotlightStyle(null);
      setTooltipStyle({ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    const rect = el.getBoundingClientRect();
    const pad = 6;
    setSpotlightStyle({
      position: 'fixed',
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      borderRadius: 10,
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
      zIndex: 101,
      pointerEvents: 'none',
      border: '2px solid #2563eb',
    });

    // Position tooltip to the right of the element
    const tooltipLeft = rect.right + 16;
    const tooltipTop = rect.top + rect.height / 2;
    setTooltipStyle({
      position: 'fixed',
      top: tooltipTop,
      left: tooltipLeft,
      transform: 'translateY(-50%)',
    });
  }

  function next() {
    if (isLast) { finish(); return; }
    setStep(s => s + 1);
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  function finish() {
    localStorage.setItem('tourCompleted', '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop (only when no spotlight) */}
      {!spotlightStyle && (
        <div className="fixed inset-0 bg-black/75 z-[100]" onClick={() => {}} />
      )}

      {/* Spotlight overlay */}
      {spotlightStyle && <div style={spotlightStyle} />}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="z-[102] w-80 rounded-2xl border border-gray-700 shadow-2xl"
        style={{ ...tooltipStyle, backgroundColor: '#1e1e30', zIndex: 102 }}
      >
        {/* Arrow (only for right-positioned tooltips) */}
        {current.position === 'right' && spotlightStyle && (
          <div style={{
            position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
            width: 0, height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '8px solid #374151',
          }} />
        )}

        <div className="p-5">
          {/* Progress dots */}
          <div className="flex gap-1.5 mb-4">
            {steps.map((_, i) => (
              <div key={i} className="h-1 rounded-full transition-all" style={{
                width: i === step ? 20 : 6,
                backgroundColor: i === step ? '#2563eb' : i < step ? '#60a5fa' : '#374151',
              }} />
            ))}
          </div>

          <h3 className="text-base font-black text-white mb-2">{current.title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-5">{current.body}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={finish}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2563eb' }}
              >
                {isLast ? "Let's go!" : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
