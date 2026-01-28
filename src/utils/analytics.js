/**
 * Analytics utility - PostHog integration
 */

import posthog from 'posthog-js';

// Initialize PostHog
posthog.init('phc_VCFM7l2HP1P1iDMdrnd3uk64WMLckJCakLjZ9XEBJxy', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'anonymous',
  capture_pageview: true,
  capture_pageleave: true,
});

/**
 * Track a custom event
 * @param {string} eventName - Name of the event
 * @param {object} props - Additional properties to track
 */
export const trackEvent = (eventName, props = {}) => {
  posthog.capture(eventName, props);
};

/**
 * Track a throw/attempt
 * @param {string} mode - The training mode
 * @param {object} details - Additional details about the throw
 */
export const trackThrow = (mode, details = {}) => {
  posthog.capture('throw_recorded', { mode, ...details });
};

/**
 * Track session completion
 * @param {string} mode - The training mode
 * @param {object} stats - Session statistics
 */
export const trackSessionComplete = (mode, stats = {}) => {
  posthog.capture('session_completed', { mode, ...stats });
};

export default posthog;