import { AnchorPosition } from './types';

/**
 * 2D trilateration using three anchor positions and distances.
 * Implements algebraic least-squares approach with Cramer's rule.
 *
 * @param anchors - Array of three anchor positions [{x,y}, {x,y}, {x,y}]
 * @param distances - Array of three distances [d1, d2, d3] in metres
 * @returns Computed tag position or null if degenerate
 */
export function trilaterate(anchors: AnchorPosition[], distances: number[]): { x: number; y: number } | null {
    // Ensure we have exactly three anchors and distances
    if (anchors.length !== 3 || distances.length !== 3) {
        // eslint-disable-next-line no-console
        console.error('Trilateration requires exactly three anchors and distances');
        return null;
    }

    const [a1, a2, a3] = anchors;
    const [d1, d2, d3] = distances.map(d => Number(d));

    // If any distance is NaN, return null
    if (isNaN(d1) || isNaN(d2) || isNaN(d3)) {
        return null;
    }

    // Extract coordinates for readability
    const x1 = a1.x, y1 = a1.y;
    const x2 = a2.x, y2 = a2.y;
    const x3 = a3.x, y3 = a3.y;

    // Compute squared distances
    const d1sq = d1 * d1;
    const d2sq = d2 * d2;
    const d3sq = d3 * d3;

    // Subtract eq1 from eq2 and eq3 to get linear equations:
    // 2(x2 - x1)x + 2(y2 - y1)y = d1^2 - d2^2 - x1^2 + x2^2 - y1^2 + y2^2
    // 2(x3 - x1)x + 2(y3 - y1)y = d1^2 - d3^2 - x1^2 + x3^2 - y1^2 + y3^2

    const A = 2 * (x2 - x1);
    const B = 2 * (y2 - y1);
    const C = d1sq - d2sq - x1*x1 + x2*x2 - y1*y1 + y2*y2;

    const D = 2 * (x3 - x1);
    const E = 2 * (y3 - y1);
    const F = d1sq - d3sq - x1*x1 + x3*x3 - y1*y1 + y3*y3;

    // Solve using Cramer's rule:
    // det = A*E - B*D
    const det = A * E - B * D;

    // If determinant is zero (or very small), the anchors are colinear -> no unique solution
    if (Math.abs(det) < 1e-10) {
        // eslint-disable-next-line no-console
        console.warn('Anchors are colinear, trilateration failed');
        return null;
    }

    const x = (C * E - B * F) / det;
    const y = (A * F - C * D) / det;

    return { x, y };
}