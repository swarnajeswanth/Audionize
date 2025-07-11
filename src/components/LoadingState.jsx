"use client";
import React from "react";

const LoadingState = ({
  isLoading = false,
  error = null,
  success = false,
  loadingText = "Loading...",
  errorText = "Something went wrong",
  successText = "Success!",
  onRetry = null,
  children = null,
  size = "medium", // small, medium, large
}) => {
  if (!isLoading && !error && !success) {
    return children;
  }

  const sizeClasses = {
    small: "w-12 h-12",
    medium: "w-16 h-16",
    large: "w-24 h-24",
  };

  const textSizes = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {isLoading && (
        <div className="flex flex-col items-center space-y-4">
          <div id="wifi-loader" className={sizeClasses[size]}>
            <svg className="circle-outer" viewBox="0 0 86 86">
              <circle className="back" cx="43" cy="43" r="40"></circle>
              <circle className="front" cx="43" cy="43" r="40"></circle>
            </svg>
            <svg className="circle-middle" viewBox="0 0 60 60">
              <circle className="back" cx="30" cy="30" r="27"></circle>
              <circle className="front" cx="30" cy="30" r="27"></circle>
            </svg>
            <svg className="circle-inner" viewBox="0 0 34 34">
              <circle className="back" cx="17" cy="17" r="14"></circle>
              <circle className="front" cx="17" cy="17" r="14"></circle>
            </svg>
            <div className="text" data-text={loadingText}></div>
          </div>
          <div className={`text-center ${textSizes[size]} text-slate-300`}>
            {loadingText}
          </div>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-center">
            <div className={`${textSizes[size]} font-medium text-red-400 mb-2`}>
              {errorText}
            </div>
            {error && (
              <div
                className={`${textSizes[size]} text-slate-400 mb-4 max-w-md`}
              >
                {typeof error === "string"
                  ? error
                  : "An unexpected error occurred"}
              </div>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {success && !isLoading && !error && (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className={`${textSizes[size]} text-green-400 font-medium`}>
            {successText}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingState;
