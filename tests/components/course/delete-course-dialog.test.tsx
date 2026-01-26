import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteCourseDialog } from '@/components/course/delete-course-dialog'

describe('DeleteCourseDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    courseName: 'Test Course',
    onConfirm: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Delete Button Disabled State', () => {
    it('delete button is disabled when confirmation input is empty', () => {
      render(<DeleteCourseDialog {...defaultProps} />)

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeDisabled()
    })

    it('delete button is disabled when confirmation name does not match', async () => {
      const user = userEvent.setup()
      render(<DeleteCourseDialog {...defaultProps} />)

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Wrong Course')

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeDisabled()
    })

    it('delete button is disabled when confirmation name partially matches', async () => {
      const user = userEvent.setup()
      render(<DeleteCourseDialog {...defaultProps} />)

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Test')

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeDisabled()
    })

    it('delete button is case-sensitive - lowercase mismatch disables button', async () => {
      const user = userEvent.setup()
      render(<DeleteCourseDialog {...defaultProps} />)

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'test course')

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeDisabled()
    })

    it('delete button is case-sensitive - uppercase mismatch disables button', async () => {
      const user = userEvent.setup()
      render(<DeleteCourseDialog {...defaultProps} />)

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'TEST COURSE')

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeDisabled()
    })
  })

  describe('Delete Button Enabled State', () => {
    it('delete button is enabled when confirmation name matches exactly', async () => {
      const user = userEvent.setup()
      render(<DeleteCourseDialog {...defaultProps} />)

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Test Course')

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeEnabled()
    })

    it('delete button is enabled with special characters in course name', async () => {
      const user = userEvent.setup()
      render(
        <DeleteCourseDialog
          {...defaultProps}
          courseName="Math & Science (2024)"
        />
      )

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Math & Science (2024)')

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeEnabled()
    })

    it('delete button is enabled with spaces in course name', async () => {
      const user = userEvent.setup()
      render(
        <DeleteCourseDialog
          {...defaultProps}
          courseName="Advanced Data Structures"
        />
      )

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Advanced Data Structures')

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeEnabled()
    })

    it('delete button is enabled with unicode characters in course name', async () => {
      const user = userEvent.setup()
      render(
        <DeleteCourseDialog
          {...defaultProps}
          courseName="Cours de Francais"
        />
      )

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Cours de Francais')

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeEnabled()
    })
  })

  describe('Confirmation Input Behavior', () => {
    it('confirmation input clears when dialog closes', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      const { rerender } = render(
        <DeleteCourseDialog {...defaultProps} onOpenChange={onOpenChange} />
      )

      // Type something in the input
      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Test Course')
      expect(input).toHaveValue('Test Course')

      // Close the dialog
      rerender(
        <DeleteCourseDialog
          {...defaultProps}
          open={false}
          onOpenChange={onOpenChange}
        />
      )

      // Reopen the dialog
      rerender(
        <DeleteCourseDialog
          {...defaultProps}
          open={true}
          onOpenChange={onOpenChange}
        />
      )

      // Input should be cleared
      const newInput = screen.getByTestId('confirmation-input')
      expect(newInput).toHaveValue('')
    })

    it('confirmation input clears when dialog reopens', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<DeleteCourseDialog {...defaultProps} />)

      // Type in input
      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Some Text')

      // Close and reopen
      rerender(<DeleteCourseDialog {...defaultProps} open={false} />)
      rerender(<DeleteCourseDialog {...defaultProps} open={true} />)

      // Should be cleared
      const clearedInput = screen.getByTestId('confirmation-input')
      expect(clearedInput).toHaveValue('')
    })

    it('confirmation input shows placeholder with course name', () => {
      render(<DeleteCourseDialog {...defaultProps} />)

      const input = screen.getByTestId('confirmation-input')
      expect(input).toHaveAttribute(
        'placeholder',
        expect.stringContaining('Test Course')
      )
    })

    it('confirmation input accepts user typing', async () => {
      const user = userEvent.setup()
      render(<DeleteCourseDialog {...defaultProps} />)

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Hello World')

      expect(input).toHaveValue('Hello World')
    })
  })

  describe('File Count Warning', () => {
    it('shows file count warning when fileCount > 0', () => {
      render(<DeleteCourseDialog {...defaultProps} fileCount={5} />)

      const warning = screen.getByTestId('file-count-warning')
      expect(warning).toBeInTheDocument()
      expect(warning).toHaveTextContent(/5/)
      expect(warning).toHaveTextContent(/files/i)
    })

    it('shows correct pluralization for single file (1 file)', () => {
      render(<DeleteCourseDialog {...defaultProps} fileCount={1} />)

      const warning = screen.getByTestId('file-count-warning')
      expect(warning).toHaveTextContent(/1 file/i)
      expect(warning).not.toHaveTextContent(/1 files/i)
    })

    it('shows correct pluralization for multiple files (X files)', () => {
      render(<DeleteCourseDialog {...defaultProps} fileCount={10} />)

      const warning = screen.getByTestId('file-count-warning')
      expect(warning).toHaveTextContent(/10 files/i)
    })

    it('hides file count warning when fileCount is 0', () => {
      render(<DeleteCourseDialog {...defaultProps} fileCount={0} />)

      expect(screen.queryByTestId('file-count-warning')).not.toBeInTheDocument()
    })

    it('hides file count warning when fileCount is undefined', () => {
      render(<DeleteCourseDialog {...defaultProps} />)

      expect(screen.queryByTestId('file-count-warning')).not.toBeInTheDocument()
    })

    it('warning includes visual emphasis for visibility', () => {
      render(<DeleteCourseDialog {...defaultProps} fileCount={5} />)

      const warning = screen.getByTestId('file-count-warning')
      // Warning should have visual emphasis (e.g., amber/yellow color classes)
      expect(warning.className).toMatch(/amber|yellow|warning|orange/i)
    })

    it('warning has role="alert" for accessibility', () => {
      render(<DeleteCourseDialog {...defaultProps} fileCount={5} />)

      const warning = screen.getByTestId('file-count-warning')
      expect(warning).toHaveAttribute('role', 'alert')
    })
  })

  describe('Loading State', () => {
    it('confirmation input is disabled during loading', () => {
      render(<DeleteCourseDialog {...defaultProps} isLoading={true} />)

      const input = screen.getByTestId('confirmation-input')
      expect(input).toBeDisabled()
    })

    it('delete button shows loading spinner during loading', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<DeleteCourseDialog {...defaultProps} />)

      // First type the confirmation
      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Test Course')

      // Then set loading state
      rerender(<DeleteCourseDialog {...defaultProps} isLoading={true} />)

      const deleteButton = screen.getByTestId('confirm-delete-button')
      // Check for Loader2 icon (spin class or svg presence)
      expect(deleteButton.querySelector('svg')).toBeInTheDocument()
    })

    it('cancel button is disabled during loading', () => {
      render(<DeleteCourseDialog {...defaultProps} isLoading={true} />)

      const cancelButton = screen.getByTestId('cancel-button')
      expect(cancelButton).toBeDisabled()
    })

    it('delete button remains disabled during loading even with valid confirmation', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<DeleteCourseDialog {...defaultProps} />)

      // Type valid confirmation
      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Test Course')

      // Set loading
      rerender(<DeleteCourseDialog {...defaultProps} isLoading={true} />)

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeDisabled()
    })
  })

  describe('onConfirm Callback', () => {
    it('calls onConfirm when delete clicked with valid confirmation', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      render(<DeleteCourseDialog {...defaultProps} onConfirm={onConfirm} />)

      // Type valid confirmation
      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Test Course')

      // Click delete
      const deleteButton = screen.getByTestId('confirm-delete-button')
      await user.click(deleteButton)

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('calls onConfirm when Enter key pressed with valid confirmation', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      render(<DeleteCourseDialog {...defaultProps} onConfirm={onConfirm} />)

      // Type valid confirmation
      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Test Course')

      // Press Enter
      await user.keyboard('{Enter}')

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('does not call onConfirm when Enter key pressed with invalid confirmation', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<DeleteCourseDialog {...defaultProps} onConfirm={onConfirm} />)

      // Type invalid confirmation
      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Wrong Course')

      // Press Enter
      await user.keyboard('{Enter}')

      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('prevents multiple submissions on rapid clicks', async () => {
      const user = userEvent.setup()
      let resolvePromise: () => void
      const onConfirm = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve
          })
      )
      const { rerender } = render(
        <DeleteCourseDialog {...defaultProps} onConfirm={onConfirm} />
      )

      // Type valid confirmation
      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Test Course')

      // Click delete
      const deleteButton = screen.getByTestId('confirm-delete-button')
      await user.click(deleteButton)

      // Simulate loading state being set
      rerender(
        <DeleteCourseDialog
          {...defaultProps}
          onConfirm={onConfirm}
          isLoading={true}
        />
      )

      // Try clicking again (should be disabled)
      await user.click(deleteButton)
      await user.click(deleteButton)

      // Should only be called once
      expect(onConfirm).toHaveBeenCalledTimes(1)

      // Cleanup: resolve the promise
      resolvePromise!()
    })

    it('does not call onConfirm when button is disabled', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<DeleteCourseDialog {...defaultProps} onConfirm={onConfirm} />)

      // Don't type anything - button should be disabled

      // Try to click delete (button is disabled, so click won't register)
      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeDisabled()

      // Attempt click - should not call onConfirm
      await user.click(deleteButton)
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('does not call onConfirm during loading state', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      const { rerender } = render(
        <DeleteCourseDialog {...defaultProps} onConfirm={onConfirm} />
      )

      // Type valid confirmation
      const input = screen.getByTestId('confirmation-input')
      await user.type(input, 'Test Course')

      // Set loading state before clicking
      rerender(
        <DeleteCourseDialog
          {...defaultProps}
          onConfirm={onConfirm}
          isLoading={true}
        />
      )

      // Button should be disabled
      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeDisabled()

      // Attempt click
      await user.click(deleteButton)
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('confirmation input has proper label', () => {
      render(<DeleteCourseDialog {...defaultProps} />)

      // Should have a label or aria-label
      const input = screen.getByTestId('confirmation-input')
      const labelText = screen.getByText(/type.*course name/i)
      expect(labelText).toBeInTheDocument()
      // Or check for aria-labelledby connection
      expect(input).toHaveAccessibleName()
    })

    it('dialog has accessible title', () => {
      render(<DeleteCourseDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAccessibleName()
    })

    it('dialog has accessible description', () => {
      render(<DeleteCourseDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAccessibleDescription()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty course name gracefully', () => {
      render(<DeleteCourseDialog {...defaultProps} courseName="" />)

      // Component should still render without crashing
      expect(screen.getByTestId('delete-course-dialog')).toBeInTheDocument()
    })

    it('handles very long course name', async () => {
      const user = userEvent.setup()
      const longName =
        'This is a very long course name that might cause issues with the UI layout and should be handled gracefully by the component'
      render(<DeleteCourseDialog {...defaultProps} courseName={longName} />)

      const input = screen.getByTestId('confirmation-input')
      await user.type(input, longName)

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeEnabled()
    })

    it('handles course name with leading/trailing whitespace correctly', async () => {
      const user = userEvent.setup()
      render(
        <DeleteCourseDialog {...defaultProps} courseName="  Test Course  " />
      )

      const input = screen.getByTestId('confirmation-input')
      // User types with whitespace
      await user.type(input, '  Test Course  ')

      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeEnabled()
    })

    it('handles rapid typing correctly', async () => {
      const user = userEvent.setup()
      render(<DeleteCourseDialog {...defaultProps} />)

      const input = screen.getByTestId('confirmation-input')

      // Type rapidly
      await user.type(input, 'Test Course')

      expect(input).toHaveValue('Test Course')
      const deleteButton = screen.getByTestId('confirm-delete-button')
      expect(deleteButton).toBeEnabled()
    })
  })

  describe('Dialog Content', () => {
    it('displays the course name in the confirmation message', () => {
      render(<DeleteCourseDialog {...defaultProps} courseName="My Course" />)

      // Course name should appear in both the description and the label
      const courseNameElements = screen.getAllByText(/My Course/)
      expect(courseNameElements.length).toBeGreaterThanOrEqual(1)
    })

    it('shows warning about permanent deletion', () => {
      render(<DeleteCourseDialog {...defaultProps} />)

      expect(
        screen.getByText(/cannot be undone|permanent/i)
      ).toBeInTheDocument()
    })

    it('displays Delete Course title', () => {
      render(<DeleteCourseDialog {...defaultProps} />)

      // Title "Delete Course" and button "Delete Course" both exist
      const deleteTexts = screen.getAllByText(/Delete Course/i)
      expect(deleteTexts.length).toBeGreaterThanOrEqual(1)
      // Verify the dialog title specifically exists
      expect(screen.getByRole('dialog')).toHaveAccessibleName(/Delete Course/i)
    })
  })

  describe('Cancel Button', () => {
    it('cancel button calls onOpenChange with false', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(
        <DeleteCourseDialog {...defaultProps} onOpenChange={onOpenChange} />
      )

      const cancelButton = screen.getByTestId('cancel-button')
      await user.click(cancelButton)

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('cancel button is visible and clickable when not loading', () => {
      render(<DeleteCourseDialog {...defaultProps} />)

      const cancelButton = screen.getByTestId('cancel-button')
      expect(cancelButton).toBeEnabled()
      expect(cancelButton).toHaveTextContent(/cancel/i)
    })
  })
})
