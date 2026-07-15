"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "react-bootstrap";

const SWIPE_THRESHOLD = 50;

export default function JoystickFab({
  children,
  onPageChange,
  currentPage,
  totalPages,
}) {
  const [showPageNumber, setShowPageNumber] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isFirstRender = useRef(true);
  const touchStartX = useRef(null);
  const swiped = useRef(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setShowPageNumber(true);
    const timer = setTimeout(() => setShowPageNumber(false), 1500);
    return () => clearTimeout(timer);
  }, [currentPage]);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    swiped.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (touchStartX.current === null || swiped.current) return;
      const deltaX = e.touches[0].clientX - touchStartX.current;
      const clampedOffset = Math.max(-60, Math.min(60, deltaX));
      setSwipeOffset(clampedOffset);

      if (deltaX > SWIPE_THRESHOLD && currentPage < totalPages) {
        swiped.current = true;
        setSwipeOffset(0);
        touchStartX.current = null;
        onPageChange(currentPage + 1);
      } else if (deltaX < -SWIPE_THRESHOLD && currentPage > 1) {
        swiped.current = true;
        setSwipeOffset(0);
        touchStartX.current = null;
        onPageChange(currentPage - 1);
      }
    },
    [currentPage, totalPages, onPageChange],
  );

  const handleTouchEnd = useCallback(() => {
    touchStartX.current = null;
    swiped.current = false;
    setSwipeOffset(0);
  }, []);

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const showPager = totalPages > 1;

  return (
    <>
      {showPager && showPageNumber && (
        <div
          className="d-xl-none"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1060,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "64px",
              fontWeight: "800",
              color: "var(--bs-body-color)",
              opacity: 0.85,
              animation: "pageFlashCenter 1.5s ease-out forwards",
            }}
          >
            {currentPage}
          </span>
        </div>
      )}

      <div
        className="d-lg-none"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1050,
          display: "flex",
          alignItems: "center",
        }}
      >
        {showPager && (
          <Button
            variant="outline-secondary"
            className="rounded-circle"
            style={{
              width: "30px",
              height: "30px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "absolute",
              right: "calc(100% - 22px)",
              opacity: hasPrev ? 0.6 : 0.2,
              zIndex: -1,
              border: "1.5px solid",
              transition: "opacity 0.2s ease",
            }}
            disabled={!hasPrev}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        )}

        <div
          onTouchStart={showPager ? handleTouchStart : undefined}
          onTouchMove={showPager ? handleTouchMove : undefined}
          onTouchEnd={showPager ? handleTouchEnd : undefined}
          style={{
            transform: showPager
              ? `translateX(${swipeOffset * 0.3}px)`
              : undefined,
            transition:
              showPager && swipeOffset === 0
                ? "transform 0.2s ease"
                : "none",
            touchAction: showPager ? "none" : undefined,
            position: "relative",
            zIndex: 1,
          }}
        >
          {children}
        </div>

        {showPager && (
          <Button
            variant="outline-secondary"
            className="rounded-circle"
            style={{
              width: "30px",
              height: "30px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "absolute",
              left: "calc(100% - 22px)",
              opacity: hasNext ? 0.6 : 0.2,
              zIndex: -1,
              border: "1.5px solid",
              transition: "opacity 0.2s ease",
            }}
            disabled={!hasNext}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        )}
      </div>

      {showPager && (
        <style jsx>{`
          @keyframes pageFlashCenter {
            0% {
              opacity: 0;
              transform: scale(0.5);
            }
            20% {
              opacity: 0.85;
              transform: scale(1.1);
            }
            35% {
              transform: scale(1);
            }
            70% {
              opacity: 0.85;
            }
            100% {
              opacity: 0;
              transform: scale(0.95);
            }
          }
        `}</style>
      )}
    </>
  );
}
