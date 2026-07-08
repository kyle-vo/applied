import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchBadge from "./MatchBadge";

describe("MatchBadge", () => {
  it("renders nothing when there is no score", () => {
    const { container } = render(<MatchBadge score={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the score as a percentage", () => {
    render(<MatchBadge score={85} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("uses green styling for scores of 80 and above", () => {
    render(<MatchBadge score={80} />);
    expect(screen.getByText("80%").className).toContain("green");
  });

  it("uses yellow styling for scores between 60 and 79", () => {
    render(<MatchBadge score={60} />);
    expect(screen.getByText("60%").className).toContain("yellow");
  });

  it("uses red styling for scores below 60", () => {
    render(<MatchBadge score={59} />);
    expect(screen.getByText("59%").className).toContain("red");
  });

  it("still renders a score of 0", () => {
    render(<MatchBadge score={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
