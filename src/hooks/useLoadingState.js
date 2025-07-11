import { useState, useCallback } from "react";

export const useLoadingState = (initialState = {}) => {
  const [state, setState] = useState({
    isLoading: false,
    error: null,
    success: false,
    ...initialState,
  });

  const startLoading = useCallback((loadingText = "Loading...") => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      success: false,
      loadingText,
    }));
  }, []);

  const setError = useCallback((error, errorText = "Something went wrong") => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error,
      success: false,
      errorText,
    }));
  }, []);

  const setSuccess = useCallback((successText = "Success!") => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: null,
      success: true,
      successText,
    }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: null,
      success: false,
    }));
  }, []);

  const withLoading = useCallback(
    async (asyncFunction, loadingText = "Loading...") => {
      try {
        startLoading(loadingText);
        const result = await asyncFunction();
        setSuccess();
        return result;
      } catch (error) {
        setError(error);
        throw error;
      }
    },
    [startLoading, setError, setSuccess]
  );

  return {
    ...state,
    startLoading,
    setError,
    setSuccess,
    reset,
    withLoading,
  };
};
