# FlangeTec® Compact Flange Qualification Test Packages

**Calculation ID:** CF-4-600-QT-001
**Test article:** LTS Energy FlangeTec® CF Series compact flange, 4 in Class 600 catalog row
**Purpose:** Demonstrate two concise qualification packages for pressure, axial load, and bending moment capacity using the current website input state.
**Prepared for:** Engineering review / third-party certifier screening
**Date:** 2026-06-14

> Certification boundary: this package records the equations and objective evidence used by the prototype calculator. It does not reproduce controlled ASME Code equation tables and does not replace the engineer-of-record calculation, controlled Code book, material certificates, seal qualification data, or certifier approval.

## 1. Input Basis

| Item | Value |
|---|---:|
| Catalog source | `FLANGETEC MASTER_old.xls`, sheet `600 MASTER` |
| Catalog size | 4 in Class 600 |
| Pressure class rating at 100 F | 1,480 psi |
| Operating pressure fraction | 65% |
| Operating pressure | 962 psi / 66.33 bar / 6.633 MPa |
| Flange material | SA-516 Gr 70 plate |
| Flange allowable stress, `S_m(100 F)` | 25.3 ksi / 174 MPa |
| Bolt material | SA-193 Gr B7 |
| Bolt allowable stress, `S_b(100 F)` | 18.8 ksi / 130 MPa |
| Applied axial load for Package 1 | 0 kip |
| Applied bending moment for Package 1 | 0 kip-ft |

## 2. Catalog Geometry and Weights

| Symbol | Description | Value |
|---|---|---:|
| `A` | Flange outside diameter | 8.750 in |
| `B_o` | Pipe outside diameter used for section estimate | 4.500 in |
| `H` | Bolt circle diameter | 7.250 in |
| `D` | Flange thickness | 1.563 in |
| `E` | Blind thickness | 2.000 in |
| `J` | Seal ID | 4.063 in |
| `K` | Seal width | 1.000 in |
| `d_b` | Bolt diameter | 0.750 in |
| `L_b` | Bolt length | 4.875 in |
| `N_b` | Number of bolts | 12 |
| - | Weight per weld-neck flange | 21.5 lb |
| - | Blind weight | 24.3 lb |
| - | Seal ring weight | 1.13 lb |
| - | Bolt set weight | 8.0 lb |
| - | Catalog assembly weight, two flanges + seal + bolting | 52.13 lb / 23.65 kg |

## 3. Equation Set

All dimensions are inches, forces are lbf, moments are in-lbf unless stated otherwise, and stresses are ksi.

### 3.1 Temperature-Derated Pressure Rating

$$
P_r = P_{class}\left(\frac{S_m(T)}{S_m(100^\circ F)}\right)
$$

For this run:

$$
P_r = 1480\left(\frac{25.3}{25.3}\right)=1480\ \text{psi}
$$

### 3.2 Seal Reaction Geometry

$$
G_s = J + K
$$

$$
A_s = \frac{\pi}{4}G_s^2
$$

For this run:

$$
G_s = 4.063 + 1.000 = 5.063\ \text{in}
$$

$$
A_s = \frac{\pi}{4}(5.063)^2 = 20.1329\ \text{in}^2
$$

### 3.3 Bolt Area and Prototype Seal Preload

Approximate total tensile stress area:

$$
A_b = N_b\left(0.78\frac{\pi}{4}d_b^2\right)
$$

Prototype target bolt preload:

$$
W_{bo}=0.70S_bA_b
$$

Minimum residual contact target:

$$
W_{min}=0.15W_{bo}
$$

For this run:

$$
A_b = 12\left(0.78\frac{\pi}{4}(0.750)^2\right)=4.1351\ \text{in}^2
$$

$$
W_{bo}=0.70(18.8)(1000)(4.1351)=54{,}418\ \text{lbf}
$$

$$
W_{min}=0.15(54{,}418)=8{,}163\ \text{lbf}
$$

### 3.4 Separating Load Limit

Class-pressure separating capacity:

$$
W_{class}=P_rA_s
$$

Prototype preload-based separating capacity:

$$
W_{preload}=0.85W_{bo}
$$

Governing separating load:

$$
W_{sep}=\min(W_{class},W_{preload})
$$

For this run:

$$
W_{class}=1480(20.1329)=29{,}797\ \text{lbf}
$$

$$
W_{preload}=0.85(54{,}418)=46{,}256\ \text{lbf}
$$

$$
W_{sep}=29{,}797\ \text{lbf}
$$

### 3.5 Operating Load Components

Pressure-end separating load:

$$
W_p = PA_s
$$

Bending moment equivalent separating load:

$$
F_M=\frac{4M}{G_s}
$$

Combined utilization:

$$
U=\frac{W_p+F_A+F_M}{W_{sep}}
$$

Residual seal contact:

$$
W_c=W_{bo}-W_p-F_A-F_M
$$

Residual seal-contact margin:

$$
M_c=W_c-W_{min}
$$

Acceptance:

$$
U\leq1.00
$$

$$
M_c\geq0
$$

### 3.6 Capacity Outputs

Maximum pressure at fixed axial load and moment:

$$
P_{max}=\frac{W_{sep}-F_A-F_M}{A_s}
$$

Maximum axial load at fixed pressure and moment:

$$
F_{A,max}=W_{sep}-W_p-F_M
$$

Maximum bending moment at fixed pressure and axial load:

$$
M_{max}=\frac{(W_{sep}-W_p-F_A)G_s}{4}
$$

### 3.7 Stress Screening

Approximate effective flange area:

$$
A_f=\frac{\pi}{4}\left(A^2-B_o^2\right)
$$

Approximate flange section modulus:

$$
Z_f=\frac{\frac{\pi}{32}\left(A^4-B_o^4\right)}{A/2}
$$

Pressure stress:

$$
\sigma_p=\frac{W_p}{1000A_f}
$$

Axial stress:

$$
\sigma_a=\frac{F_A}{1000A_f}
$$

Bending stress:

$$
\sigma_m=\frac{M}{1000Z_f}
$$

Combined flange stress:

$$
\sigma_c=\sigma_p+\sigma_a+\sigma_m
$$

Bolt operating stress:

$$
\sigma_b=\frac{W_p+F_A+F_M}{1000A_b}
$$

Acceptance:

$$
\frac{\sigma_c}{S_m}\leq1.00
$$

$$
\frac{\sigma_b}{S_b}\leq1.00
$$

## 4. Qualification Package 1: Current Operating Point

**Case definition:** current website state, 65% of derated class pressure, no applied axial load, no applied bending moment.

| Quantity | Result |
|---|---:|
| Operating pressure, `P` | 962 psi / 66.33 bar / 6.633 MPa |
| Pressure separating load, `W_p` | 19.368 kip |
| Applied axial load, `F_A` | 0.000 kip |
| Applied bending moment, `M` | 0.000 kip-ft |
| Equivalent bending separating load, `F_M` | 0.000 kip |
| Combined utilization, `U` | 0.650 |
| Residual seal contact, `W_c` | 35.050 kip |
| Residual seal-contact margin, `M_c` | 26.888 kip |
| Flange combined stress | 0.438 ksi / 3.02 MPa |
| Flange stress ratio | 0.017 |
| Bolt operating stress | 4.684 ksi / 32.29 MPa |
| Bolt stress ratio | 0.249 |
| Result | **PASS** |

### Package 1 Remaining Capacities at Current Pressure

| Capacity | Value |
|---|---:|
| Maximum pressure at current axial/moment | 1,480 psi / 102.04 bar / 10.204 MPa |
| Remaining axial load at current pressure/moment | 10.429 kip / 46.39 kN |
| Remaining bending moment at current pressure/axial load | 1.100 kip-ft / 1.49 kN-m |

## 5. Qualification Package 2: Independent Capacity Envelope

**Case definition:** independent axis capacities with the other two load components set to zero.

| Independent capacity | Value | Governing limit |
|---|---:|---|
| Maximum pressure, `P_max` | 1,480 psi / 102.04 bar / 10.204 MPa | Class pressure separating load |
| Maximum axial load, `F_{A,max}` | 29.797 kip / 132.54 kN | Class pressure-equivalent separating load |
| Maximum bending moment, `M_max` | 3.143 kip-ft / 4.26 kN-m | Class pressure-equivalent separating load |

### Package 2 Extreme Point Checks

| Extreme point | Flange stress | Flange ratio | Bolt stress | Bolt ratio | Seal margin | Result |
|---|---:|---:|---:|---:|---:|---|
| `P = P_max`, `F_A = 0`, `M = 0` | 0.674 ksi | 0.027 | 7.206 ksi | 0.383 | 16.459 kip | PASS |
| `P = 0`, `F_A = F_{A,max}`, `M = 0` | 0.674 ksi | 0.027 | 7.206 ksi | 0.383 | 16.459 kip | PASS |
| `P = 0`, `F_A = 0`, `M = M_{max}` | 0.308 ksi | 0.012 | 7.206 ksi | 0.383 | 16.459 kip | PASS |

## 6. Professional Review Notes

1. The current compact test article passes both prototype qualification packages.
2. The governing capacity in this implementation is the derated Class 600 pressure-equivalent separating load, not flange stress or bolt stress.
3. The compact flange stress ratios are low because the screening section model uses the catalog outside diameter and pipe OD as the effective annulus. The engineer of record should replace this with the controlled Code section, hub, rigidity, and rotation equations for final certification.
4. The residual seal-contact target is a prototype acceptance rule. Final sign-off should use the project-specific metal ring seal qualification basis, seal vendor data, leakage class, and any required FEA or prototype test evidence.
5. Final certification package should include material test reports, bolt certificates, seal material/certification data, drawing revision, controlled Code edition, design temperature envelope, corrosion allowance basis, and third-party review disposition.

## 7. Sign-Off

| Role | Name | Signature | Date |
|---|---|---|---|
| Prepared by |  |  |  |
| Checked by |  |  |  |
| Engineer of record |  |  |  |
| Third-party certifier |  |  |  |

## 8. Trademark And Publication Notice

FlangeTec® is a registered trademark of LTS Energy. The mark and supplied
catalog data identify the referenced compact-flange product line only and do not
imply sponsorship, approval, or certification of this package by LTS Energy.

ASME is a registered trademark of The American Society of Mechanical Engineers.
Publication titles and designations are referenced nominatively for engineering
context only. This package is not endorsed, approved, certified, or published by
ASME and does not reproduce controlled Code equations or tables.
