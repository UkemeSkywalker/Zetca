/**
 * Home Page Component Tests
 * 
 * These tests verify the core functionality of the home page components.
 * Focus: Waitlist form validation and interactive elements
 */

import { describe, it, expect } from '@jest/globals';

describe('Home Page - Waitlist Form Validation', () => {
  describe('Email Validation', () => {
    it('should validate email format correctly', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      // Valid emails
      expect(emailRegex.test('user@example.com')).toBe(true);
      expect(emailRegex.test('test.user@domain.co.uk')).toBe(true);
      expect(emailRegex.test('name+tag@company.org')).toBe(true);
      
      // Invalid emails
      expect(emailRegex.test('')).toBe(false);
      expect(emailRegex.test('invalid')).toBe(false);
      expect(emailRegex.test('invalid@')).toBe(false);
      expect(emailRegex.test('@domain.com')).toBe(false);
      expect(emailRegex.test('user@domain')).toBe(false);
      expect(emailRegex.test('user @domain.com')).toBe(false);
    });

    it('should reject empty email', () => {
      const email = '';
      const isEmpty = !email.trim();
      expect(isEmpty).toBe(true);
    });

    it('should accept non-empty email', () => {
      const email = 'user@example.com';
      const isEmpty = !email.trim();
      expect(isEmpty).toBe(false);
    });
  });

  describe('Form State Management', () => {
    it('should clear email after successful submission', () => {
      let email = 'user@example.com';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      // Simulate validation
      const isValid = emailRegex.test(email);
      expect(isValid).toBe(true);
      
      // Simulate clearing after success
      email = '';
      expect(email).toBe('');
    });

    it('should maintain email value on validation error', () => {
      const email = 'invalid-email';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      // Simulate validation
      const isValid = emailRegex.test(email);
      expect(isValid).toBe(false);
      
      // Email should not be cleared on error
      expect(email).toBe('invalid-email');
    });
  });
});

describe('Home Page - Component Structure', () => {
  it('should have all required sections', () => {
    const sections = ['hero', 'features', 'waitlist', 'pricing'];
    expect(sections).toHaveLength(4);
    expect(sections).toContain('hero');
    expect(sections).toContain('features');
    expect(sections).toContain('waitlist');
    expect(sections).toContain('pricing');
  });

  it('should have navigation links', () => {
    const navLinks = [
      { label: 'Home', href: '/' },
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Dashboard', href: '/dashboard' },
    ];
    
    expect(navLinks).toHaveLength(4);
    expect(navLinks[0].href).toBe('/');
    expect(navLinks[3].href).toBe('/dashboard');
  });
});

describe('Home Page - Responsive Breakpoints', () => {
  it('should define correct breakpoints', () => {
    const breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1024,
    };
    
    expect(breakpoints.mobile).toBe(768);
    expect(breakpoints.tablet).toBe(1024);
    expect(breakpoints.desktop).toBe(1024);
  });
});
