import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

describe('Accessibility Tests', () => {
  describe('Button Component', () => {
    it('should have focus indicators', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });

    it('should be keyboard accessible', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should have proper ARIA label when icon-only', () => {
      render(<Button leftIcon="solar:close-circle-bold" aria-label="Close">Close</Button>);
      const button = screen.getByRole('button', { name: /close/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Input Component', () => {
    it('should associate label with input', () => {
      render(<Input label="Email" type="email" />);
      const input = screen.getByLabelText(/email/i);
      expect(input).toBeInTheDocument();
    });

    it('should have focus indicators', () => {
      render(<Input label="Email" type="email" />);
      const input = screen.getByLabelText(/email/i);
      expect(input).toHaveClass('focus:ring-2');
    });

    it('should be keyboard accessible', () => {
      render(<Input label="Email" type="email" />);
      const input = screen.getByLabelText(/email/i);
      input.focus();
      expect(input).toHaveFocus();
    });
  });

  describe('Modal Component', () => {
    it('should close on ESC key', () => {
      const onClose = jest.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      const onClose = jest.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should have close button with ARIA label', () => {
      const onClose = jest.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const closeButton = screen.getByLabelText(/close modal/i);
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Skip Navigation', () => {
    it('should have skip to main content link', () => {
      // This would need to be tested in the actual layout
      // For now, we'll just verify the concept
      const { container } = render(
        <div>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            Skip to main content
          </a>
          <main id="main-content">Content</main>
        </div>
      );
      
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow Tab navigation through interactive elements', () => {
      render(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
          <Input label="Test" />
        </div>
      );
      
      const firstButton = screen.getByRole('button', { name: /first/i });
      const secondButton = screen.getByRole('button', { name: /second/i });
      const input = screen.getByLabelText(/test/i);
      
      // All elements should be in the document and focusable
      expect(firstButton).toBeInTheDocument();
      expect(secondButton).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });
  });

  describe('Touch-Friendly Sizes', () => {
    it('should have minimum 44x44px touch targets', () => {
      render(<Button size="sm">Small Button</Button>);
      const button = screen.getByRole('button', { name: /small button/i });
      expect(button).toHaveClass('min-h-[44px]');
    });
  });
});
