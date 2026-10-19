# hooks

Hooks hold no rules. Each one subscribes to something and calls the module that
owns the rules, under `db/`, `services/` or `utils/`, which is what makes those
rules testable without rendering. A rule that turns up in a hook moves to its
module, with the test beside it.

Cycle and pregnancy modes keep separate hooks (`useMarkedDates` and
`usePregnancyMarkedDates`, for one) by docs/adr/0001.
