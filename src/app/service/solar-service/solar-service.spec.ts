import { TestBed } from '@angular/core/testing';

import { SolarService } from './solar-service';

describe('SolarService', () => {
  let service: SolarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SolarService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should track plants as state', () => {
    const before = service.count();
    service.add({ id: 'test', name: 'Test', powerKw: 1 });
    expect(service.count()).toBe(before + 1);

    service.remove('test');
    expect(service.count()).toBe(before);
  });
});
