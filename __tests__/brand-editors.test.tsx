import { render, screen, fireEvent } from '@testing-library/react';
import { ColorsEditor, EditableChips, EditableText, FontPicker } from '@/components/strategist/BrandEditors';

jest.mock('@iconify/react', () => ({ Icon: () => null }));

describe('editing the brand result by hand', () => {
  it('rewords text, saving on Enter and not on Escape', () => {
    const onSave = jest.fn();
    render(<EditableText value="Cloud engineer" label="tagline" editable onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /edit tagline/i }));
    const box = screen.getByRole('textbox', { name: 'tagline' });
    fireEvent.change(box, { target: { value: 'I make cloud simple' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('I make cloud simple');

    fireEvent.click(screen.getByRole('button', { name: /edit tagline/i }));
    fireEvent.change(screen.getByRole('textbox', { name: 'tagline' }), { target: { value: 'Nope' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'tagline' }), { key: 'Escape' });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('is plain text when it can’t be edited', () => {
    render(<EditableText value="Cloud engineer" label="tagline" editable={false} onSave={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Cloud engineer')).toBeTruthy();
  });

  it('adds, renames and removes chips', () => {
    const onSave = jest.fn();
    render(<EditableChips items={['Learners', 'Recruiters']} label="customers" editable onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Recruiters' }));
    expect(onSave).toHaveBeenLastCalledWith(['Learners']);

    fireEvent.click(screen.getByRole('button', { name: 'Add customers' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'New customers' }), { target: { value: 'DevOps teams' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'New customers' }), { key: 'Enter' });
    expect(onSave).toHaveBeenLastCalledWith(['Learners', 'Recruiters', 'DevOps teams']);

    fireEvent.click(screen.getByRole('button', { name: 'Learners' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Rename Learners' }), { target: { value: 'Students' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Rename Learners' }), { key: 'Enter' });
    expect(onSave).toHaveBeenLastCalledWith(['Students', 'Recruiters']);
  });

  it('doesn’t add a duplicate chip', () => {
    const onSave = jest.fn();
    render(<EditableChips items={['Learners']} label="customers" editable onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add customers' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'New customers' }), { target: { value: 'learners' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'New customers' }), { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('changes a colour by hex and name', () => {
    const onSave = jest.fn();
    const colors = [
      { hex: '#0C0C0C', role: 'primary' as const, name: 'Ink' },
      { hex: '#D7E2EA', role: 'background' as const, name: 'Cloud Mist' },
    ];
    render(<ColorsEditor colors={colors} editable onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /edit colour ink/i }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Hex' }), { target: { value: '#b5532f' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Rust' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith([{ hex: '#B5532F', role: 'primary', name: 'Rust' }, colors[1]]);
  });

  it('removes and adds colours', () => {
    const onSave = jest.fn();
    const colors = [
      { hex: '#0C0C0C', role: 'primary' as const, name: 'Ink' },
      { hex: '#D7E2EA', role: 'background' as const, name: 'Cloud Mist' },
    ];
    render(<ColorsEditor colors={colors} editable onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /edit colour cloud mist/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onSave).toHaveBeenLastCalledWith([colors[0]]);

    fireEvent.click(screen.getByRole('button', { name: /add a colour/i }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Hex' }), { target: { value: 'E0A526' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith([...colors, expect.objectContaining({ hex: '#E0A526' })]);
  });

  it('changes and removes a font', () => {
    const onSave = jest.fn();
    render(<FontPicker role="Heading" size="text-5xl" font="Kanit" editable onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /change the heading font/i }));
    const box = screen.getByRole('combobox', { name: 'Heading font' });
    fireEvent.change(box, { target: { value: 'Fraunces' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSave).toHaveBeenLastCalledWith('Fraunces');

    fireEvent.click(screen.getByRole('button', { name: /change the heading font/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Heading font' }), { target: { value: '' } });
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Heading font' }), { key: 'Enter' });
    expect(onSave).toHaveBeenLastCalledWith(null);
  });
});
