import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import IncidentForm from '../../components/IncidentForm';
import * as useIncidentsHook from '../../hooks/useIncidents';

vi.mock('../../lib/push', () => ({
  isPushSupported: vi.fn(() => false),
  subscribeToPush: vi.fn(),
}));

describe('IncidentForm Component', () => {
  const mockCreateIncident = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useIncidentsHook, 'default').mockReturnValue({
      createIncident: mockCreateIncident,
      getIncidents: vi.fn(),
      getIncidentById: vi.fn(),
      updateIncidentStatus: vi.fn(),
      upvoteIncident: vi.fn(),
      loading: false,
      error: null,
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <IncidentForm />
      </BrowserRouter>
    );
  };

  it('renders all required form fields and submit button', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /report new incident/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Broken streetlight/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe the issue in detail/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use my current location/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit incident report/i })).toBeInTheDocument();
  });

  it('disables submit button and prevents submission when coordinates are not acquired', async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Broken streetlight/i), {
      target: { value: 'Broken Pipe' },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the issue in detail/i), {
      target: { value: 'Water leaking all over the street' },
    });

    const submitBtn = screen.getByRole('button', { name: /submit incident report/i });
    expect(submitBtn).toBeDisabled();

    // Trigger form submit directly to verify internal guard
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    expect(screen.getByText(/please acquire your location coordinates before submitting/i)).toBeInTheDocument();
    expect(mockCreateIncident).not.toHaveBeenCalled();
  });

  it('handles geolocation permission denial gracefully', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_success, error) => {
        error({ message: 'User denied Geolocation' });
      }),
    };
    // @ts-ignore
    global.navigator.geolocation = mockGeolocation;

    renderComponent();

    const locationBtn = screen.getByRole('button', { name: /use my current location/i });
    fireEvent.click(locationBtn);

    await waitFor(() => {
      expect(screen.getByText(/failed to get location: user denied geolocation/i)).toBeInTheDocument();
    });
  });

  it('acquires coordinates and calls createIncident with correct payload on valid submit', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
        });
      }),
    };
    // @ts-ignore
    global.navigator.geolocation = mockGeolocation;
    mockCreateIncident.mockResolvedValueOnce({ _id: 'inc-999', title: 'Deep Pothole' });

    renderComponent();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Broken streetlight/i), {
      target: { value: 'Deep Pothole' },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the issue in detail/i), {
      target: { value: 'Causing traffic slow down' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'pothole' },
    });
    fireEvent.change(screen.getByPlaceholderText(/123 Main St, City/i), {
      target: { value: 'Brigade Road' },
    });

    // Acquire location
    const locationBtn = screen.getByRole('button', { name: /use my current location/i });
    fireEvent.click(locationBtn);

    await waitFor(() => {
      expect(screen.getByText(/location acquired/i)).toBeInTheDocument();
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /submit incident report/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateIncident).toHaveBeenCalledWith({
        title: 'Deep Pothole',
        description: 'Causing traffic slow down',
        category: 'pothole',
        coordinates: [77.5946, 12.9716],
        address: 'Brigade Road',
        media: [],
      });
      expect(screen.getByText(/incident reported successfully/i)).toBeInTheDocument();
    });
  });
});
