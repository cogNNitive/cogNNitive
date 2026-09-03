---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/analysis/analysis_V_0-1-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md"
template_version: "V_0-1-0"
title: "Analysis Template"
relationship_types:
  hierarchy:
    enabled: true
    via: index block
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[Analysis]]
  * [[Assumptions]]
  * [[Risks]]
  * [[SWOT]]
  * [[Keys]]
  * [[Suggestions]]
* [[Validation]]
  * [[Coherence]]
  * [[Experiments]]

# NN Concept Definition

## NN Concept Definition: Analysis
icon:: microscope
type:: category
color:: red
weight:: 80

## NN Concept Definition: Assumptions
icon:: circle-help
type:: weight
color:: red
weight:: 50

## NN Concept Definition: Risks
icon:: shield-alert
type:: weight
color:: red
weight:: 90

## NN Concept Definition: Suggestions
icon:: messages-square
type:: weight
color:: red
weight:: 30

## NN Concept Definition: SWOT
icon:: layout-grid
type:: text
color:: red
weight:: 10

## NN Concept Definition: Keys
icon:: key-round
type:: weight
color:: red
weight:: 50

## NN Concept Definition: Validation
icon:: clipboard-check
type:: category
color:: green
weight:: 90

## NN Concept Definition: Coherence
icon:: link
type:: weight
color:: green
weight:: 25

## NN Concept Definition: Experiments
icon:: flask-conical
type:: weight
color:: green
weight:: 40

# NN Marker Definition

## NN Marker Definition: importance
applies_to:: [Element]
symbol:: *
icon:: plus
color:: blue

## NN Marker Definition: completion
applies_to:: [Element]
symbol:: >
icon:: check
color:: blue

## NN Marker Definition: certainty
applies_to:: [Element, Concept]
symbol:: ?
icon:: help-circle
color:: green

## NN Marker Definition: priority
applies_to:: [Element]
symbol:: !
icon:: flag
color:: red

## NN Marker Definition: rating
applies_to:: [Element]
symbol:: +
icon:: star
color:: green

# NN Matrix Definition

## NN Matrix Definition: Assumptions-Risks Matrix
source:: Assumptions
target:: Risks
values:: [Max, Very High, High, Slightly High, Neutral, Slightly Low, Low, Very Low, Min]
widget:: set
description:: Scores how strongly each Risk threatens each Assumption (risk assessment).

## NN Matrix Definition: Experiments-Assumptions Matrix
source:: Experiments
target:: Assumptions
values:: [Max, Very High, High, Slightly High, Neutral, Slightly Low, Low, Very Low, Min]
widget:: set
description:: Scores how much each Experiment validates each Assumption.

# Analysis Template

## A reusable template for the strategic review layer of a business model — assumptions, risks, SWOT, key factors, coherence checks, and validation experiments

## Philosophy

The Analysis Template isolates the *evaluative* half of business modeling from the
*descriptive* half. Where a business model describes what the venture is — its
market, value propositions, operations, and finances — analysis asks whether that
description holds together and where it is most likely to be wrong. It groups the
work into two categories: **Analysis** (surfacing assumptions, risks, SWOT
positions, key success factors, and improvement suggestions) and **Validation**
(checking internal coherence and running experiments that turn assumptions into
evidence).

It is a standalone level-2 template. It declares no `includes`; instead, a
composite template such as the `business` umbrella `includes` both this template
and `business-model`. Both halves declare the same five markers
(`importance`, `completion`, `certainty`, `priority`, `rating`) with identical
bodies so that composing them raises no collision — the shared marker set is the
business vocabulary, kept in sync across the two halves.

## Objectives

1. Provide a compact, reusable concept set for the strategic-review layer of any model.
2. Keep assumptions, risks, and experiments explicitly linked through evaluable matrices.
3. Compose cleanly with `business-model` under the `business` umbrella without redeclaring shared vocabulary differently.
4. Be usable on its own as the `parent_spec` of a lightweight analysis-only model.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Analysis** | `category` | Grouping concept for the strategic-review elements |
| **Assumptions** | `weight` | Hypotheses the model depends on, to be validated or invalidated |
| **Risks** | `weight` | Potential negative outcomes that threaten the model |
| **Suggestions** | `weight` | Concrete improvement proposals arising from the review |
| **SWOT** | `text` | Strengths, weaknesses, opportunities, and threats summary |
| **Keys** | `weight` | Key success factors and critical capabilities |
| **Validation** | `category` | Grouping concept for coherence and experimentation |
| **Coherence** | `weight` | Internal-consistency checks between model components |
| **Experiments** | `weight` | Tests that turn assumptions into evidence |

### Markers

| Marker | Symbol | Purpose |
|---|---|---|
| `importance` | `*` | Core importance score |
| `completion` | `>` | Progress indicator |
| `certainty` | `?` | Confidence level |
| `priority` | `!` | Urgency flag |
| `rating` | `+` | Quality rating |

### Matrices

| Matrix | Source → Target | Purpose |
|---|---|---|
| Assumptions-Risks | Assumptions → Risks | How strongly each risk threatens each assumption |
| Experiments-Assumptions | Experiments → Assumptions | How much each experiment validates each assumption |

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ✅ | Source→target tables |
| Graph edge | ❌ | Not applicable |
| Sequence | ❌ | Not applicable |

## Template

### Level 3 Model Template (Lightweight)

To create an analysis model, create a level 3 FILE mode document with:

```yaml
---
level: 3
parent_spec:
  name: "analysis_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/analysis/analysis_V_0-1-0_NN.md"
model_version: "V_x-y-z"
title: "<Analysis Name>"
---

> [!NOTE]
> This is an **iNNfo document**...

# NN index
* [[Analysis]]
  * [[Assumptions]]
  * [[Risks]]
  * [[SWOT]]
  * [[Keys]]
  * [[Suggestions]]
* [[Validation]]
  * [[Coherence]]
  * [[Experiments]]

# NN Analysis
## NN Analysis: Strategic Assessment
Overall assessment narrative.

# NN Assumptions
## NN Assumptions: A key assumption.

# NN Risks
## NN Risks: A key risk.

# NN SWOT
Strengths, weaknesses, opportunities, threats.

# NN Keys
## NN Keys: A key success factor.

# NN Coherence
## NN Coherence: A consistency check.

# NN Experiments
## NN Experiments: An experiment to run.

# NN matrices: assumptions-risks matrix
| Assumptions \ Risks | A key risk. |
| :--- | :---: |
| A key assumption. | High |

# NN matrices: experiments-assumptions matrix
| Experiments \ Assumptions | A key assumption. |
| :--- | :---: |
| An experiment to run. | High |
```

## Examples

### Canonical Sample

No sample ships for this template version. The canonical sample lives with the
current template version, at `specs/templates/analysis/samples/Ghostbusters_V_0-2-0_analysis_NN.md`.

# Concept Guidance Documentation

## Analysis

### Summary
The process of examining and evaluating the different components of the business model to identify their importance and coherence and determine the risks it entails.

### Description
"Analysis" in business modeling refers to the systematic examination and evaluation of the various components of a business model. This process is crucial in identifying the significance and coherence of each element, as well as determining the potential risks associated with the model.

During the analysis phase, each aspect of the business model is scrutinized. This includes the value proposition, customer segments, channels, customer relationships, revenue streams, key resources, key activities, key partnerships, and cost structure. The goal is to understand how these components interact with each other and contribute to the overall functioning of the business.

For instance, a company might analyze its business model to assess the viability of a new product. This would involve examining the product's potential market, the competition, the proposed revenue streams, the necessary resources and activities, and the potential costs. The analysis might reveal that while the product has a large potential market, the competition is fierce and the cost structure is high, making the product risky.

The analysis phase is not only about identifying potential risks, but also about finding opportunities for improvement and innovation. It can reveal inefficiencies in the business model, areas for cost reduction, potential new revenue streams, and opportunities for better serving customers.

In essence, "Analysis" in business modeling is about understanding a business model in depth. It is a critical aspect of business design, as it directly impacts the ability of a business to mitigate risks, seize opportunities, and ultimately, achieve success.

### Methodologies
**SWOT Analysis**
The SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) is a tool that can be used to analyze the different components of a business model. It helps to identify the strengths and weaknesses of the business model, as well as the opportunities and threats it faces. This analysis can help to identify the risks associated with the business model and determine its coherence and importance.

**PESTEL Analysis**
The PESTEL analysis (Political, Economic, Social, Technological, Environmental, Legal) is a tool that can be used to analyze the external macro-environmental factors that affect an organization. It can be used to understand the risks and opportunities presented by these factors and how they impact the business model.

**Value Chain Analysis**
This tool, developed by Michael Porter, is used to analyze the activities that a business performs in order to deliver a valuable product or service to the market. It helps to identify the key activities that create value in the business model and evaluate their importance and coherence.

**Business Model Canvas**
The Business Model Canvas, developed by Alexander Osterwalder, is a tool that can be used to visualize and analyze a business model. It includes nine key components, including value proposition, customer segments, channels, customer relationships, revenue streams, key resources, key activities, key partnerships, and cost structure. This tool can be used to examine and evaluate these components to identify their importance and coherence and determine the risks they entail.

**Gap Analysis**
Gap Analysis is a tool that can be used to compare the current state of the business model with the desired future state. It helps to identify the gaps in the business model and develop strategies to close these gaps. This analysis can help to identify the risks associated with the business model and determine its coherence and importance.

**Scenario Planning**
Scenario Planning is a tool that can be used to analyze the potential future scenarios that could impact the business model. It helps to identify the risks and opportunities associated with these scenarios and develop strategies to manage them. This tool can be used to examine and evaluate the different components of the business model to identify their importance and coherence.

### Prompts
`Conduct a coherence analysis linking value proposition, segments, and revenue streams.`
`Identify gaps or misalignments in our business model components.`
`Prioritize components by strategic importance and risk level.`
`Recommend corrective actions to improve model coherence.`
`Develop a roadmap for iterative validation and refinement of analysis findings.`

---

## Assumptions

### Summary
Assumptions refer to the hypotheses or beliefs that underpin a business idea or model. These are the uncertain elements about customers, markets, or products that must be validated to ensure the viability and success of the business.

### Description
"Assumption List" in business modeling refers to a list of hypotheses or beliefs that the entrepreneurial team holds to be true and relevant to their business. These assumptions are often based on the team's understanding of the market, the customer, the product or service, and the business environment. They serve as the foundation upon which the business model is built and are used to guide decision-making and strategy development.

Here are the key aspects of "Assumption List" in business modeling:

- Market Assumptions: These are assumptions about the market in which the business operates, including the size of the market, the growth rate, the level of competition, and the market trends. For example, a startup might assume that the market for their product is growing at a rate of 10% per year.
- Customer Assumptions: These are assumptions about the customers that the business serves, including their needs, preferences, behaviors, and willingness to pay. For example, a business might assume that their customers value quality over price.
- Product or Service Assumptions: These are assumptions about the product or service that the business offers, including its functionality, value proposition, and competitive advantage. For example, a tech company might assume that their software is more user-friendly than the competition.
- Business Environment Assumptions: These are assumptions about the broader business environment, including the regulatory environment, the economic environment, and the technological environment. For example, a business might assume that there will be no significant regulatory changes in the next few years.
- Financial Assumptions: These are assumptions about the financial aspects of the business, including the cost structure, the revenue model, and the profitability. For example, a business might assume that their cost of goods sold will decrease over time due to economies of scale.

It's important to note that while assumptions are necessary to move forward with a business model, they should be validated or invalidated as soon as possible through market research, customer feedback, and other forms of testing. This helps to reduce risk and uncertainty, and allows the business to adapt its model based on real-world evidence.

### Methodologies
**Lean Startup Methodology**
The Lean Startup methodology, developed by Eric Ries, heavily emphasizes the importance of making assumptions and then testing them. The assumption list is a key component of this methodology. The entrepreneurial team lists their assumptions about their business model and then designs experiments to validate or invalidate these assumptions.
**Business Model Canvas**
While the Business Model Canvas does not explicitly include an assumption list, it is often used in conjunction with one. The entrepreneurial team can list their assumptions about each of the nine components of the canvas and then test these assumptions through customer discovery and validation.
**Value Proposition Canvas**
Similar to the Business Model Canvas, the Value Proposition Canvas can be used in conjunction with an assumption list. The entrepreneurial team can make assumptions about the customer profile and value map and then test these assumptions.
**Customer Development Model**
The Customer Development Model, developed by Steve Blank, is a four-step framework that emphasizes the importance of making and testing assumptions. The assumption list is a key component of the first step, customer discovery.
**Pivot or Persevere**
This tool, also from the Lean Startup methodology, is used after assumptions have been tested. If an assumption is invalidated, the entrepreneurial team must decide whether to pivot (change a fundamental part of the business model) or persevere (keep testing the current model). The assumption list is a critical input to this decision.
**Assumption Mapping**
This tool, developed by David Bland, is specifically designed to help teams identify and test their riskiest assumptions. The assumption list is a key component of this tool. The team lists their assumptions and then maps them based on their level of uncertainty and the impact on the business if the assumption is wrong.

### Prompts
`List the key assumptions in our financial and customer forecasts.`
`Classify assumptions by level of uncertainty and impact.`
`Design experiments or data collection methods to test top 5 assumptions.`
`Define success criteria and metrics for each assumption test.`
`Outline a timeline and responsible teams for assumption validation.`

---

## Risks

### Summary
Potential negative outcomes or uncertainties that may affect the success and sustainability of a business model.

### Description
a Risks in business modeling refers to the identification and documentation of potential negative outcomes or uncertainties that may affect the success and sustainability of a business model. This concept is rooted in the understanding that every business operates in an environment of uncertainty and risk, and that proactive risk management is crucial for business survival and growth.

In the context of business design, a Risks can take many forms. It could be a list of potential market risks such as changes in customer preferences, competitive threats, or regulatory changes. It could also include operational risks such as supply chain disruptions, technology failures, or talent shortages. Financial risks such as currency fluctuations, interest rate changes, or liquidity issues may also be included. 

The Risk List serves several key functions in business modeling. Firstly, it helps to identify and prioritize risks, enabling businesses to focus their resources and efforts on the most significant threats. By understanding the potential impact and likelihood of each risk, businesses can make informed decisions about risk mitigation strategies.

Secondly, a Risk List can facilitate proactive risk management. By identifying potential risks early, businesses can take steps to prevent or reduce their impact, rather than reacting to them after they occur. This can enhance business resilience, reduce costs, and protect business value.

Thirdly, a Risk List can enhance strategic planning and decision-making. By considering potential risks in their strategic planning, businesses can develop more robust and resilient strategies that take into account the full range of uncertainties they face.

Lastly, a Risk List can improve stakeholder communication and trust. By transparently communicating about potential risks and their management strategies, businesses can build trust with stakeholders, including investors, customers, employees, and regulators.

In summary, the Risk List model in business design is a strategic approach that involves identifying, documenting, and managing potential negative outcomes or uncertainties that may affect the success and sustainability of a business model. It is a crucial tool for enhancing business resilience, strategic planning, stakeholder communication, and overall business performance.

### Methodologies
**Risk Management Plan**
A Risk Management Plan is a document that a project manager prepares to foresee risks, estimate impacts, and define responses to issues. It also contains a risk assessment matrix. A risk is "an uncertain event or condition that, if it occurs, has a positive or negative effect on a project’s objectives." This tool is used to identify potential risks in the early stages of a project and is a part of the overall project management plan.
**SWOT Analysis**
The SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats) is a strategic planning tool used to identify and analyze the strengths, weaknesses, opportunities, and threats involved in a project or business. It can be used to identify potential risks (threats) that could negatively affect the business model.
**PESTEL Analysis**
The PESTEL Analysis (Political, Economic, Social, Technological, Environmental, Legal) is a framework or tool used by marketers to analyze and monitor the macro-environmental factors that have an impact on an organization. By understanding these external environments, businesses can maximize the opportunities and minimize the threats to the organization.
**Risk Breakdown Structure (RBS)**
The Risk Breakdown Structure (RBS) is a hierarchical representation of risks according to their risk categories. This tool is used in risk management to help identify and manage potential risks associated with a project or business.
**Failure Mode and Effects Analysis (FMEA)**
Failure Mode and Effects Analysis (FMEA) is a step-by-step approach for identifying all possible failures in a design, a manufacturing or assembly process, or a product or service. It is a common tool for risk assessment and is used to identify potential failure modes, determine their effect on the operation of the product, and identify actions to mitigate the failures.
**Monte Carlo Simulation**
Monte Carlo Simulation is a computerized mathematical technique that allows people to account for risk in quantitative analysis and decision making. It provides a range of possible outcomes and the probabilities they will occur for any choice of action. It shows the extreme possibilities—the outcomes of going for broke and for the most conservative decision—along with all possible consequences for middle-of-the-road decisions.

### Prompts
`Identify the top 5 risks associated with our business model and explain their potential impact.`
`What mitigation strategies can we implement for each identified risk?`
`How likely is each risk to occur, and what triggers should alert us?`
`How would each risk affect our key metrics if realized?`
`What contingency plans should we develop to address worst-case scenarios?`

---

## Suggestions

### Summary
*No summary provided.*

### Description
*No description provided.*

### Methodologies
*No methodologies provided.*

### Prompts
`Based on our current analysis, suggest three improvements to strengthen our value proposition.`
`What process optimizations could enhance operational efficiency?`
`Suggest cost-effective marketing tactics to increase brand awareness.`
`Recommend strategies to improve customer retention and reduce churn.`
`Provide suggestions to refine our pricing model for better margins.`

---

## SWOT

### Summary
The SWOT analysis provides a comprehensive overview of the company’s current strategic position by identifying its internal strengths and weaknesses, as well as external opportunities and threats.

### Description
The SWOT analysis provides a comprehensive overview of the company’s current strategic position by identifying its internal strengths and weaknesses, as well as external opportunities and threats. Key strengths may include a strong brand reputation, innovative technology, or a highly skilled workforce. Conversely, weaknesses might involve limited market presence, high operational costs, or dependency on key suppliers. The goal of this analysis is to capitalize on strengths while addressing and mitigating weaknesses.

On the external side, the opportunities identified could range from emerging market trends and new customer segments to potential strategic partnerships. Threats may include increased competition, regulatory challenges, or economic downturns. This section helps to develop a strategic plan that leverages strengths to seize opportunities while creating defensive strategies to protect against potential threats, ensuring the business remains resilient and adaptable in a dynamic market environment.
In the context of business design, storytelling can take many forms. It could be the brand's founding story that illustrates its mission and values, customer success stories that demonstrate the value of its products or services, or future-oriented stories that paint a vision of what the brand aims to achieve.

### Methodologies
**Brand Storytelling Framework**
This tool helps businesses to craft a compelling narrative that communicates their brand's purpose, values, and mission. It includes elements such as the brand's history, vision, mission, values, personality, and customer promise. The framework guides businesses in telling their story in a way that resonates with their target audience and differentiates them from their competitors.

**Hero's Journey**
The Hero's Journey, or the Monomyth, is a narrative pattern identified by Joseph Campbell that appears in drama, storytelling, myth, religious ritual, and psychological development. It describes the typical adventure of the archetype known as The Hero, the person who goes out and achieves great deeds on behalf of the group, tribe, or civilization. Businesses can use this pattern to structure their brand storytelling, positioning their customers as the heroes and themselves as the guides.

**StoryBrand Framework**
Developed by Donald Miller, the StoryBrand Framework is a 7-part storytelling tool that helps businesses clarify their brand message. It guides businesses in creating a story where the customer is the hero, the business is the guide, and the product or service is the tool that helps the hero overcome their problem and achieve their goal.

**Transmedia Storytelling**
This approach involves creating and sharing a narrative across multiple platforms and formats, using the benefits of each to enhance the overall storytelling. It allows businesses to engage with their audience in a variety of ways and to communicate their brand's purpose, values, and mission in a more immersive and interactive manner.

**Narrative Transportation Theory**
This theory suggests that when people lose themselves in a story, their attitudes and intentions change to reflect that story. Businesses can use this theory to create compelling brand stories that 'transport' their audience and influence their perceptions and behaviors.

**Emotional Branding**
Developed by Marc Gobé, this approach focuses on building brands that appeal directly to a consumer's emotional state, needs and aspirations. Emotional branding involves creating a story that will resonate with target customers on an emotional level, helping to build strong and lasting relationships.

### Prompts
`List our top 3 strengths and describe how we can capitalize on them.`
`Identify our top 3 weaknesses and propose actions to address them.`
`Highlight 3 external opportunities and outline how to pursue them.`
`Point out 3 threats and recommend mitigation strategies.`
`How can we integrate SWOT findings into our strategic planning process?`

---

## Keys

### Summary
*No summary provided.*

### Description
*No description provided.*

### Methodologies
*No methodologies provided.*

### Prompts
`Define the key success factors critical to our market entry and growth.`
`What capabilities must we develop to achieve our strategic objectives?`
`Identify the key metrics that serve as leading indicators of our success.`
`Which partnerships are essential to unlock growth opportunities?`
`Which organizational competencies are crucial to sustain performance over time?`

---

## Validation

### Summary
The process of testing and verifying the assumptions and hypotheses underlying a business model.

### Description
"Validation" in business modeling refers to the process of testing and verifying the assumptions and hypotheses that underpin a business model. This process is essential in ensuring that the business model is based on accurate and realistic assumptions, and that it is capable of delivering the expected results.

During the validation phase, the risks, assumptions and hypotheses of the business model are put to the test. This could involve conducting market research to validate customer segments and value propositions, running financial simulations to verify revenue streams and cost structures, or carrying out pilot projects to test key activities and partnerships.

For example, a company might validate its business model by launching a minimum viable product (MVP) to a small segment of its target market. The feedback and data gathered from this MVP launch can then be used to validate or invalidate the assumptions about the product's market fit, pricing strategy, and customer acquisition channels. If the assumptions are validated, the company can proceed with confidence. If they are invalidated, the company can pivot and adjust its business model based on the new insights.

The validation phase is not only about confirming the viability of a business model, but also about learning and adapting. It allows businesses to learn from their mistakes, adapt their strategies, and continuously improve their business models.

In essence, "Validation" in business modeling is about ensuring that a business model is grounded in reality and capable of delivering success. It is a critical aspect of business design, as it directly impacts the ability of a business to survive, thrive, and grow in a competitive market.

### Methodologies
**Lean Startup Methodology**
Developed by Eric Ries, the Lean Startup Methodology emphasizes the importance of validating business models through a build-measure-learn feedback loop. This involves creating a minimum viable product (MVP), measuring how it performs in the market, and learning from the results to iterate or pivot the business model.
**Business Model Canvas**
The Business Model Canvas, while not specifically focused on validation, can be used as a tool for this purpose. By mapping out the key components of a business model, it allows for a comprehensive view that can be used to identify assumptions and hypotheses that need to be tested.
**Customer Development**
This methodology, developed by Steve Blank, is focused on understanding customer needs and validating business model assumptions through customer interaction. It involves four steps: customer discovery, customer validation, customer creation, and company building.
**Experiment Board**
The Experiment Board is a tool developed by Javelin that helps entrepreneurs to validate their business ideas. It guides them through the process of identifying their riskiest assumptions, designing experiments to test these assumptions, and interpreting the results.
**Value Proposition Design**
This tool, also developed by Alexander Osterwalder, is focused on designing and testing value propositions. It can be used to validate the value proposition component of a business model by helping to understand the fit between the product or service and customer needs.
**Pivot or Persevere**
This is a decision-making process used in the Lean Startup Methodology. After a cycle of building, measuring, and learning, entrepreneurs need to decide whether to pivot (make a fundamental change to the business model) or persevere (keep testing the current business model). This decision is based on the validation (or lack thereof) of the business model's assumptions.
**Assumption Mapping**
This tool, developed by David J Bland, helps teams to identify and test their riskiest assumptions. It involves creating a map of assumptions, categorizing them based on their risk and uncertainty, and then designing experiments to test the riskiest assumptions.

### Prompts
`Outline a validation plan including customer interviews, surveys, and prototype testing.`
`Which MVP features should we test first to validate our value proposition?`
`How can we measure product-market fit, and which indicators will we use?`
`Design an A/B test to validate pricing or messaging assumptions.`
`What criteria will determine when validation is sufficient to scale the business?`

---

## Coherence

### Summary
*No summary provided.*

### Description
*No description provided.*

### Methodologies
*No methodologies provided.*

### Prompts
`Evaluate the coherence between our value proposition, customer segments, and revenue streams.`
`Identify any misalignments among business model components and suggest corrective actions.`
`How does each core activity support our overall strategy?`
`Map interdependencies among resources, activities, and partners to ensure alignment.`
`Propose a framework to maintain model coherence as we evolve.`

---

## Experiments

### Summary
Experiments are tests or trials designed to validate assumptions and hypotheses about a business model's value proposition, customer segments, and revenue streams.

### Description
"Experiment List" in business modeling refers to a systematic list of tests or trials designed to validate the assumptions and hypotheses about a business model's value proposition, customer segments, and revenue streams. This list is used as a roadmap to test and validate the viability and effectiveness of a business model before its full-scale implementation.

An experiment list can include various types of tests depending on the specific aspects of the business model that need validation. For instance, it may include customer interviews to validate assumptions about customer needs and preferences. It may also include prototype testing to validate the feasibility and attractiveness of a product or service offering.

Moreover, an experiment list can also include market tests to validate assumptions about the size and profitability of a market segment. It may also include financial tests to validate assumptions about revenue streams and cost structures.

The experiment list serves as a structured approach to risk management in business design and modeling. It helps business leaders and stakeholders to identify and address potential flaws and weaknesses in a business model before they become costly mistakes. It also provides valuable insights and learnings that can be used to refine and improve the business model.

In conclusion, an experiment list is a critical tool in business design and modeling. It provides a systematic and evidence-based approach to validating the key assumptions and hypotheses of a business model, reducing risks and increasing the chances of success. It is a crucial component of a lean and agile business model, promoting continuous learning and adaptation in response to market feedback and changes.

### Methodologies
**Lean Startup Methodology**
The Lean Startup methodology, developed by Eric Ries, emphasizes the importance of conducting experiments to validate business assumptions. The methodology encourages businesses to create a "Minimum Viable Product" (MVP) and use it to test key business hypotheses. The feedback received from these experiments is then used to iterate and improve the business model.
**Design Thinking**
Design Thinking is a problem-solving approach that involves empathizing with users, defining problems, ideating solutions, prototyping, and testing. The testing phase often involves conducting experiments to validate the solutions developed during the ideation phase. These experiments can provide valuable insights into the value proposition, customer segments, and revenue streams of a business model.
**Business Model Canvas**
The Business Model Canvas, developed by Alexander Osterwalder, includes a component called "channels" which can be used to design and conduct experiments. These experiments can test assumptions about how a company communicates and delivers its value proposition to its customer segments.
**Value Proposition Canvas**
This tool, also developed by Alexander Osterwalder, is designed to help businesses understand their customers' needs and create products and services that meet those needs. It encourages businesses to conduct experiments to validate their assumptions about their value proposition and customer segments.
**Pivot or Persevere**
This is a decision-making process used in the Lean Startup methodology. After conducting experiments, businesses use the results to decide whether to pivot (make a fundamental change to the business model) or persevere (keep improving the current model). This process is crucial for validating a business model's value proposition, customer segments, and revenue streams.
**Growth Hacking**
Growth Hacking is a marketing strategy that focuses on rapid experimentation across marketing channels and product development to identify the most effective ways to grow a business. These experiments can provide valuable insights into a business model's value proposition, customer segments, and revenue streams.

### Prompts
`Design an experiment to test customer interest via a targeted landing page.`
`Propose a pricing experiment to determine the optimal price point.`
`Plan a pilot program to evaluate operational feasibility in a small market.`
`What metrics will measure experiment success, and how will we collect the data?`
`How should we iterate on the experiment based on initial results?`
