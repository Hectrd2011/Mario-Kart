from .usa import T as USA
from .russia_ukraine import R as RUS, U as UKR
from .china import C as PRC, TW as ROC
from .europe import E as ENG, G as GER, F as FRA
from .middle_east import I as ISR, P as PER
from .regional import TREES as REGIONAL
from .generic import GEN, SHARED_IDEAS, OPINION

TREES = [USA, RUS, UKR, PRC, ROC, ENG, GER, FRA, ISR, PER] + REGIONAL + [GEN]
