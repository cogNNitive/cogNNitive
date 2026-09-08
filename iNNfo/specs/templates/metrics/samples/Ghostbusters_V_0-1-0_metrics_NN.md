---
level: 3
parent_spec:
  name: "metrics_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/metrics/spec_NN.md"
model_version: "V_0-1-0"
title: "Ghostbusters Containment Revenue Projection"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN Metrics

## NN Metrics: Monthly Net Result
metricValue:: <calculated>
metricFormula:: monthly containment revenue - monthly operating subtotal - monthly spectral tax
dependsOn:: [[Monthly Containment Revenue]]
metricType:: result
metricUnit:: USD/month
evolution:: [[Fixed Evolution]]

## NN Metrics: Monthly Containment Revenue
metricValue:: <calculated>
metricFormula:: billable containments x average containment fee - platform commission
dependsOn:: [[Billable Containments]]
metricType:: revenue
metricUnit:: USD/month
evolution:: [[Compound 5 Evolution]]

## NN Metrics: Monthly Operating Subtotal
metricValue:: <calculated>
metricFormula:: proton packs upkeep + trap maintenance + Ecto-1 fuel
dependsOn:: [[Proton Packs Upkeep]]
metricType:: expense
metricUnit:: USD/month
evolution:: [[Fixed Evolution]]

## NN Metrics: Monthly Spectral Tax
metricValue:: <calculated>
metricFormula:: 21% x monthly gross containment income
dependsOn:: [[Monthly Containment Revenue]]
metricType:: tax
metricUnit:: USD/month
evolution:: [[Fixed Evolution]]

## NN Metrics: Proton Packs Upkeep
metricValue:: 400
metricFormula:: <fixed monthly>
metricType:: expense
metricUnit:: USD/month
evolution:: [[Fixed Evolution]]

## NN Metrics: Trap Maintenance
metricValue:: 175
metricFormula:: <fixed monthly>
metricType:: expense
metricUnit:: USD/month
evolution:: [[Fixed Evolution]]

## NN Metrics: Ecto-1 Fuel
metricValue:: 120
metricFormula:: <variable with mileage>
metricType:: expense
metricUnit:: USD/month
evolution:: [[Additive 5 Evolution]]

## NN Metrics: Vault Expansion Capex
metricValue:: 25000
metricFormula:: <one-off containment vault expansion>
metricType:: investment
metricUnit:: USD
evolution:: [[Fixed Evolution]]

# NN Variables

## NN Variables: Billable Containments
variableValue:: 30
variableType:: days
variableUnit:: containments

## NN Variables: Average Containment Fee
variableValue:: 700
variableType:: rate
variableUnit:: USD/containment

## NN Variables: Platform Commission Pct
variableValue:: 15
variableType:: fee
variableUnit:: "%"

## NN Variables: Monthly Growth Pct
variableValue:: 5
variableType:: growth
variableUnit:: "%"

# NN Evolution

## NN Evolution: Fixed Evolution
evolutionType:: fixed
evolutionFactor:: 0

## NN Evolution: Compound 5 Evolution
evolutionType:: compound
evolutionFactor:: 5

## NN Evolution: Additive 5 Evolution
evolutionType:: additive
evolutionFactor:: 5

# NN Scenario

## NN Scenario: Commercial Blitz Scenario
scenarioMonths:: 12
scenarioNotes:: High-demand commercial season with maximum billable containments.

## NN Scenario: Steady Retainer Scenario
scenarioMonths:: 12
scenarioNotes:: Municipal retainer baseline with stable monthly containment volume.

# NN matrices: metrics-dependencies matrix
| Metrics \ Metrics | Monthly Net Result | Monthly Containment Revenue | Monthly Operating Subtotal | Monthly Spectral Tax |
| :--- | :---: | :---: | :---: | :---: |
| Monthly Containment Revenue | DependsOn | - | - | DependsOn |
| Monthly Operating Subtotal | DependsOn | - | - | - |
| Monthly Spectral Tax | DependsOn | - | - | - |

# NN matrices: metric-variables matrix
| Metrics \ Variables | Billable Containments | Average Containment Fee | Platform Commission Pct |
| :--- | :---: | :---: | :---: |
| Monthly Containment Revenue | Uses | Uses | Uses |

# NN matrices: scenario-metrics matrix
| Scenario \ Metrics | Monthly Net Result | Monthly Containment Revenue | Vault Expansion Capex |
| :--- | :---: | :---: | :---: |
| Commercial Blitz Scenario | Includes | Includes | Includes |
| Steady Retainer Scenario | Includes | Includes | - |

# NN matrices: item-markers matrix
| Item \ Marker | is_variable | is_formula | is_derived |
| :--- | :---: | :---: | :---: |
| Billable Containments | X | - | - |
| Average Containment Fee | X | - | - |
| Platform Commission Pct | X | - | - |
| Monthly Growth Pct | X | - | - |
| Proton Packs Upkeep | X | - | - |
| Trap Maintenance | X | - | - |
| Ecto-1 Fuel | X | - | - |
| Vault Expansion Capex | X | - | - |
| Monthly Net Result | - | X | - |
| Monthly Containment Revenue | - | X | - |
| Monthly Operating Subtotal | - | X | - |
| Monthly Spectral Tax | - | X | - |
