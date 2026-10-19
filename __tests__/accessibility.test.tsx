import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

describe('Accessibility Tests', () => {
  describe('Button Component', () => {
    it('is a focusable native button named by its text', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });

      button.focus();
      expect(button).toHaveFocus();
    });

    it('can be named with aria-label', () => {
      render(
        <Button leftIcon="solar:close-circle-bold" aria-label="Dismiss notice">
          ×
        </Button>
      );

      expect(screen.getByRole('button', { name: 'Dismiss notice' })).toBeInTheDocument();
    });

    it('is disabled and inert while loading', () => {
      const onClick = jest.fn();
      render(
        <Button isLoading onClick={onClick}>
          Save
        </Button>
      );
      const button = screen.getByRole('button');

      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('is disabled when the disabled prop is set', () => {
      render(<Button disabled>Save</Button>);

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
  });

  describe('Input Component', () => {
    it('associates its label with the input', () => {
      render(<Input label="Email" type="email" />);

      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('type', 'email');
    });

    it('generates distinct ids so two inputs keep their own labels', () => {
      render(
        <>
          <Input label="First name" />
          <Input label="Last name" />
        </>
      );

      const first = screen.getByRole('textbox', { name: 'First name' });
      const last = screen.getByRole('textbox', { name: 'Last name' });
      expect(first).not.toBe(last);
      expect(first.id).not.toEqual(last.id);
    });

    it('is keyboard focusable and still calls the caller’s focus handlers', () => {
      const onFocus = jest.fn();
      const onBlur = jest.fn();
      render(<Input label="Email" type="email" onFocus={onFocus} onBlur={onBlur} />);
      const input = screen.getByLabelText('Email');

      input.focus();
      expect(input).toHaveFocus();
      expect(onFocus).toHaveBeenCalledTimes(1);

      input.blur();
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('shows the error message instead of the helper text', () => {
      const { rerender } = render(<Input label="Email" helperText="We never share it" />);
      expect(screen.getByText('We never share it')).toBeInTheDocument();

      rerender(<Input label="Email" helperText="We never share it" error="Enter a valid email" />);
      expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
      expect(screen.queryByText('We never share it')).not.toBeInTheDocument();
    });

    it('lets the user reveal and hide a password with a labelled toggle', () => {
      render(<Input label="Password" type="password" />);
      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('type', 'password');

      const show = screen.getByRole('button', { name: 'Show password' });
      expect(show).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(show);

      expect(input).toHaveAttribute('type', 'text');
      const hide = screen.getByRole('button', { name: 'Hide password' });
      expect(hide).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(hide);
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('Modal Component', () => {
    const renderModal = (onClose = jest.fn(), isOpen = true) =>
      render(
        <Modal isOpen={isOpen} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

    it('is a modal dialog named by its title', () => {
      renderModal();
      const dialog = screen.getByRole('dialog', { name: 'Test Modal' });

      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveTextContent('Modal content');
    });

    it('renders nothing while closed', () => {
      renderModal(jest.fn(), false);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes on Escape', () => {
      const onClose = jest.fn();
      renderModal(onClose);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores other keys', () => {
      const onClose = jest.fn();
      renderModal(onClose);

      fireEvent.keyDown(document, { key: 'Enter' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes from its labelled close button', () => {
      const onClose = jest.fn();
      renderModal(onClose);

      fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('locks page scroll while open and restores it when closed', () => {
      const { rerender } = renderModal();
      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={jest.fn()} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('unset');
    });

    it('stops listening for Escape once closed', () => {
      const onClose = jest.fn();
      const { rerender } = renderModal(onClose);
      rerender(
        <Modal isOpen={false} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
