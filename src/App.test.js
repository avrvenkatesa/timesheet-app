import { render, screen } from '@testing-library/react';
import App from './App';

test('renders timesheet application', () => {
  render(<App />);

  // Test for actual content in your timesheet app
  const titleElement = screen.getByText(/Timesheet \(SQLite\)/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders create project section', () => {
  render(<App />);

  const createProjectElement = screen.getByText(/Create Project/i);
  expect(createProjectElement).toBeInTheDocument();
});

test('renders time entries table', () => {
  render(<App />);

  const timeEntriesElement = screen.getByText(/Time Entries/i);
  expect(timeEntriesElement).toBeInTheDocument();
});

test('renders no entries message initially', () => {
  render(<App />);

  const noEntriesElement = screen.getByText(/No entries yet/i);
  expect(noEntriesElement).toBeInTheDocument();
});  