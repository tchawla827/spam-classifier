"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Key = string;

interface VirtualStackProps<T> {
  items: T[];
  getKey: (item: T) => Key;
  estimateSize: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
}

export function VirtualStack<T>({
  items,
  getKey,
  estimateSize,
  overscan = 600,
  className,
  renderItem,
}: VirtualStackProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const parentRef = useRef<HTMLElement | null>(null);
  const sizeMapRef = useRef(new Map<Key, number>());
  const resizeObserversRef = useRef(new Map<Key, ResizeObserver>());
  const frameRef = useRef<number | null>(null);
  const [viewport, setViewport] = useState({
    scrollTop: 0,
    height: 0,
    containerTop: 0,
  });

  const measure = useCallback(() => {
    const container = containerRef.current;
    const parent = parentRef.current;
    if (!container || !parent) return;

    const containerRect = container.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const containerTop = containerRect.top - parentRect.top + parent.scrollTop;

    setViewport({
      scrollTop: parent.scrollTop,
      height: parent.clientHeight,
      containerTop,
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const parent = container.closest<HTMLElement>("[data-app-scroll-container]");
    if (!parent) return;
    parentRef.current = parent;

    const scheduleMeasure = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        measure();
      });
    };

    scheduleMeasure();

    parent.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    const parentObserver = new ResizeObserver(scheduleMeasure);
    parentObserver.observe(parent);

    return () => {
      parent.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      parentObserver.disconnect();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [measure]);

  useEffect(() => {
    const validKeys = new Set(items.map((item) => getKey(item)));

    for (const key of sizeMapRef.current.keys()) {
      if (!validKeys.has(key)) {
        sizeMapRef.current.delete(key);
      }
    }

    for (const [key, observer] of resizeObserversRef.current.entries()) {
      if (!validKeys.has(key)) {
        observer.disconnect();
        resizeObserversRef.current.delete(key);
      }
    }
  }, [items, getKey]);

  const sizes = useMemo(() => {
    return items.map((item) => sizeMapRef.current.get(getKey(item)) ?? estimateSize);
  }, [items, getKey, estimateSize, viewport]);

  const totalSize = useMemo(() => sizes.reduce((sum, size) => sum + size, 0), [sizes]);

  const { startIndex, endIndex, paddingTop, paddingBottom } = useMemo(() => {
    const viewportStart = Math.max(0, viewport.scrollTop - viewport.containerTop - overscan);
    const viewportEnd = viewport.scrollTop - viewport.containerTop + viewport.height + overscan;

    let offset = 0;
    let start = 0;
    while (start < sizes.length && offset + sizes[start] < viewportStart) {
      offset += sizes[start];
      start += 1;
    }

    let visibleOffset = offset;
    let end = start;
    while (end < sizes.length && visibleOffset < viewportEnd) {
      visibleOffset += sizes[end];
      end += 1;
    }

    const safeEnd = Math.max(start, end);
    const top = offset;
    const visibleSize = sizes.slice(start, safeEnd).reduce((sum, size) => sum + size, 0);

    return {
      startIndex: start,
      endIndex: safeEnd,
      paddingTop: top,
      paddingBottom: Math.max(0, totalSize - top - visibleSize),
    };
  }, [overscan, sizes, totalSize, viewport]);

  const setMeasuredNode = useCallback(
    (key: Key, node: HTMLDivElement | null) => {
      const existingObserver = resizeObserversRef.current.get(key);
      if (existingObserver) {
        existingObserver.disconnect();
        resizeObserversRef.current.delete(key);
      }

      if (!node) return;

      const updateSize = () => {
        const next = Math.ceil(node.getBoundingClientRect().height);
        if (sizeMapRef.current.get(key) !== next) {
          sizeMapRef.current.set(key, next);
          measure();
        }
      };

      updateSize();

      const observer = new ResizeObserver(() => updateSize());
      observer.observe(node);
      resizeObserversRef.current.set(key, observer);
    },
    [measure]
  );

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div ref={containerRef} className={className}>
      {paddingTop > 0 && <div style={{ height: paddingTop }} aria-hidden="true" />}
      {visibleItems.map((item, index) => {
        const actualIndex = startIndex + index;
        const key = getKey(item);
        return (
          <div
            key={key}
            ref={(node) => setMeasuredNode(key, node)}
            className={actualIndex < items.length - 1 ? "pb-2" : undefined}
          >
            {renderItem(item, actualIndex)}
          </div>
        );
      })}
      {paddingBottom > 0 && <div style={{ height: paddingBottom }} aria-hidden="true" />}
    </div>
  );
}
