import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  describe('rendering', () => {
    it('renders input element', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Email" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('associates label with input via id', () => {
      render(<Input label="Email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toBeInTheDocument();
    });

    it('uses custom id when provided', () => {
      render(<Input label="Email" id="custom-id" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('id', 'custom-id');
    });

    it('generates id from label if not provided', () => {
      render(<Input label="First Name" />);
      const input = screen.getByLabelText('First Name');
      expect(input).toHaveAttribute('id', 'first-name');
    });
  });

  describe('error state', () => {
    it('displays error message when error prop is provided', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error styles when error is present', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });

    it('does not show helper text when error is present', () => {
      render(<Input error="Error" helperText="Helper text" />);
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('helper text', () => {
    it('displays helper text when provided', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('shows helper text when no error', () => {
      render(<Input helperText="Helper text" />);
      expect(screen.getByText('Helper text')).toBeInTheDocument();
    });
  });

  describe('password input', () => {
    it('renders password input with hidden text by default', () => {
      render(<Input type="password" placeholder="Password" />);
      const input = screen.getByPlaceholderText('Password');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('shows toggle button for password input', () => {
      render(<Input type="password" />);
      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeInTheDocument();
    });

    it('toggles password visibility when toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(<Input type="password" placeholder="Password" />);

      const input = screen.getByPlaceholderText('Password');
      const toggleButton = screen.getByRole('button');

      expect(input).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('does not show toggle button for non-password inputs', () => {
      render(<Input type="text" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('accepts user input', async () => {
      const user = userEvent.setup();
      render(<Input placeholder="Type here" />);

      const input = screen.getByPlaceholderText('Type here');
      await user.type(input, 'Hello World');

      expect(input).toHaveValue('Hello World');
    });

    it('calls onChange when value changes', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      render(<Input onChange={handleChange} placeholder="Type here" />);

      const input = screen.getByPlaceholderText('Type here');
      await user.type(input, 'test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('can be focused', () => {
      render(<Input placeholder="Focus me" />);
      const input = screen.getByPlaceholderText('Focus me');

      input.focus();
      expect(input).toHaveFocus();
    });
  });

  describe('disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('does not accept input when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled placeholder="Disabled" />);

      const input = screen.getByPlaceholderText('Disabled');
      await user.type(input, 'test');

      expect(input).toHaveValue('');
    });
  });

  describe('custom className', () => {
    it('applies custom className to input', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('different input types', () => {
    it('renders email input', () => {
      render(<Input type="email" placeholder="Email" />);
      const input = screen.getByPlaceholderText('Email');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders number input', () => {
      render(<Input type="number" placeholder="Number" />);
      const input = screen.getByPlaceholderText('Number');
      expect(input).toHaveAttribute('type', 'number');
    });
  });
});
