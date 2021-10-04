'use strict';

const util = (function() {

    const isEqualSelections = function(selections1, selections2) {
        return (
            selections1.length === selections2.length &&
            selections1.every(
                (sel1, i) => (
                    sel1.anchor.isEqual(selections2[i].anchor) &&
                    sel1.active.isEqual(selections2[i].active)
                )
            )
        );
    };

    return {
        isEqualSelections
    }
})();

module.exports = { util };
